CREATE TABLE IF NOT EXISTS professional_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name text NOT NULL,
    terminology jsonb NOT NULL DEFAULT '{}'::jsonb,
    definition jsonb NOT NULL DEFAULT '{}'::jsonb,
    starter_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_templates_name_per_user
    ON professional_templates (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS professional_templates_starter_per_user
    ON professional_templates (user_id, starter_key)
    WHERE starter_key IS NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_professional_template_id uuid
    REFERENCES professional_templates (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS project_details (
    item_id uuid PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
    template_id uuid NOT NULL REFERENCES professional_templates (id),
    parent_project_id uuid REFERENCES items (id) ON DELETE SET NULL,
    project_role text NOT NULL DEFAULT 'project',
    work_type text,
    deliverable_type text,
    stage text,
    priority text NOT NULL DEFAULT 'media',
    due_date date,
    client_name text,
    description text,
    custom_values jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (project_role IN ('project', 'task', 'milestone', 'deliverable', 'note')),
    CHECK (priority IN ('baja', 'media', 'alta'))
);

CREATE INDEX IF NOT EXISTS project_details_parent
    ON project_details (parent_project_id);

CREATE INDEX IF NOT EXISTS project_details_template
    ON project_details (template_id);

INSERT INTO professional_templates (user_id, name, terminology, definition, starter_key)
SELECT u.id, seed.name, seed.terminology::jsonb, seed.definition::jsonb, seed.starter_key
FROM users u
CROSS JOIN (
    VALUES
    (
        'Software',
        '{"project":"Proyecto","projects":"Proyectos","client":"Cliente"}',
        '{"stages":[{"key":"planificacion","label":"Planificación"},{"key":"desarrollo","label":"Desarrollo"},{"key":"pruebas","label":"Pruebas"},{"key":"despliegue","label":"Despliegue"}],"work_types":[{"key":"producto","label":"Producto"},{"key":"web","label":"Web"},{"key":"movil","label":"Aplicación móvil"},{"key":"infraestructura","label":"Infraestructura"}],"deliverables":[{"key":"release","label":"Versión"},{"key":"documentacion","label":"Documentación"},{"key":"demo","label":"Demostración"}],"fields":[{"key":"repositorio","label":"Repositorio","type":"url"},{"key":"stack","label":"Stack tecnológico","type":"text"},{"key":"entorno","label":"Entorno","type":"select","options":["Desarrollo","Pruebas","Producción"]}]}',
        'software'
    ),
    (
        'Jurídico',
        '{"project":"Expediente","projects":"Expedientes","client":"Cliente"}',
        '{"stages":[{"key":"analisis","label":"Análisis"},{"key":"redaccion","label":"Redacción"},{"key":"presentacion","label":"Presentación"},{"key":"vista","label":"Vista"},{"key":"cerrado","label":"Cerrado"}],"work_types":[{"key":"asesoria","label":"Asesoría"},{"key":"contrato","label":"Contrato"},{"key":"procedimiento","label":"Procedimiento"},{"key":"recurso","label":"Recurso"}],"deliverables":[{"key":"escrito","label":"Escrito"},{"key":"contrato","label":"Contrato"},{"key":"informe","label":"Informe jurídico"}],"fields":[{"key":"jurisdiccion","label":"Jurisdicción","type":"text"},{"key":"numero_expediente","label":"N.º de expediente","type":"text"},{"key":"contraparte","label":"Contraparte","type":"text"}]}',
        'legal'
    ),
    (
        'Economía y consultoría',
        '{"project":"Encargo","projects":"Encargos","client":"Cliente"}',
        '{"stages":[{"key":"alcance","label":"Alcance"},{"key":"datos","label":"Datos"},{"key":"analisis","label":"Análisis"},{"key":"recomendacion","label":"Recomendación"},{"key":"entrega","label":"Entrega"}],"work_types":[{"key":"consultoria","label":"Consultoría"},{"key":"estudio","label":"Estudio"},{"key":"valoracion","label":"Valoración"},{"key":"planificacion","label":"Planificación"}],"deliverables":[{"key":"informe","label":"Informe"},{"key":"modelo","label":"Modelo"},{"key":"presentacion","label":"Presentación"}],"fields":[{"key":"periodo","label":"Periodo analizado","type":"text"},{"key":"fuentes","label":"Fuentes","type":"text"},{"key":"escenario","label":"Escenario","type":"select","options":["Base","Optimista","Conservador"]}]}',
        'economy'
    ),
    (
        'Personalizada',
        '{"project":"Proyecto","projects":"Proyectos","client":"Cliente"}',
        '{"stages":[{"key":"inicio","label":"Inicio"},{"key":"en_curso","label":"En curso"},{"key":"revision","label":"Revisión"},{"key":"cerrado","label":"Cerrado"}],"work_types":[{"key":"general","label":"General"}],"deliverables":[{"key":"entrega","label":"Entrega"}],"fields":[]}',
        'custom'
    )
) AS seed(name, terminology, definition, starter_key)
WHERE NOT EXISTS (
    SELECT 1 FROM professional_templates pt
    WHERE pt.user_id = u.id AND pt.starter_key = seed.starter_key
);

UPDATE users u
SET default_professional_template_id = pt.id
FROM professional_templates pt
WHERE pt.user_id = u.id
  AND pt.starter_key = 'custom'
  AND u.default_professional_template_id IS NULL;

INSERT INTO project_details (item_id, template_id, project_role, priority)
SELECT i.id, u.default_professional_template_id, 'project', 'media'
FROM items i
JOIN users u ON u.id = i.user_id
WHERE i.module = 'proyectos'
  AND u.default_professional_template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_details pd WHERE pd.item_id = i.id
  );
