-- Impersia platform — fase 0 (doc 23). Esquema aislado del OS legacy.
-- Aplicar: psql "$DATABASE_URL" -f platform/services/api/migrations/001_core.sql

CREATE SCHEMA IF NOT EXISTS platform;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A1 — Cuenta y organización

CREATE TABLE platform.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tax_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.org_members (
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES platform.users (id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX org_members_user_idx ON platform.org_members (user_id);

-- A3 — Contactos

CREATE TABLE platform.contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    kind text NOT NULL DEFAULT 'client'
        CHECK (kind IN ('client', 'supplier', 'both')),
    name text NOT NULL,
    legal_name text,
    tax_id text,
    email text,
    phone text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE INDEX contacts_org_name_idx ON platform.contacts (org_id, name);
CREATE INDEX contacts_org_archived_idx ON platform.contacts (org_id, archived_at);

-- A4 — Procesos (oportunidad / encargo ligero)

CREATE TABLE platform.processes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    contact_id uuid REFERENCES platform.contacts (id) ON DELETE SET NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'won', 'lost', 'on_hold', 'closed')),
    owner_user_id uuid REFERENCES platform.users (id) ON DELETE SET NULL,
    due_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX processes_org_status_idx ON platform.processes (org_id, status);
CREATE INDEX processes_contact_idx ON platform.processes (contact_id);

-- A4 / A5 — Actividades (tareas, llamadas, reuniones, agenda)

CREATE TABLE platform.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    kind text NOT NULL DEFAULT 'task'
        CHECK (kind IN ('task', 'call', 'meeting', 'email_log', 'note')),
    title text NOT NULL,
    body text,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'done', 'cancelled')),
    contact_id uuid REFERENCES platform.contacts (id) ON DELETE SET NULL,
    process_id uuid REFERENCES platform.processes (id) ON DELETE SET NULL,
    assignee_user_id uuid REFERENCES platform.users (id) ON DELETE SET NULL,
    due_at timestamptz,
    start_at timestamptz,
    end_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activities_org_status_due_idx
    ON platform.activities (org_id, status, due_at);
CREATE INDEX activities_org_start_idx
    ON platform.activities (org_id, start_at)
    WHERE start_at IS NOT NULL;
CREATE INDEX activities_contact_idx ON platform.activities (contact_id);
CREATE INDEX activities_process_idx ON platform.activities (process_id);

-- A6 — Documentos (metadatos; fichero en storage externo)

CREATE TABLE platform.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    contact_id uuid REFERENCES platform.contacts (id) ON DELETE SET NULL,
    process_id uuid REFERENCES platform.processes (id) ON DELETE SET NULL,
    filename text NOT NULL,
    storage_key text NOT NULL,
    mime_type text,
    size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_org_filename_idx ON platform.documents (org_id, filename);
CREATE INDEX documents_contact_idx ON platform.documents (contact_id);

-- B — Entradas de canal (registro manual / webhook futuro)

CREATE TABLE platform.channel_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'other')),
    contact_id uuid REFERENCES platform.contacts (id) ON DELETE SET NULL,
    subject text,
    body text NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX channel_entries_org_contact_idx
    ON platform.channel_entries (org_id, contact_id, occurred_at DESC);

-- D — Borradores comerciales (no factura legal Impersia v1)

CREATE TABLE platform.commercial_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    contact_id uuid REFERENCES platform.contacts (id) ON DELETE SET NULL,
    process_id uuid REFERENCES platform.processes (id) ON DELETE SET NULL,
    doc_kind text NOT NULL DEFAULT 'quote'
        CHECK (doc_kind IN ('quote', 'proforma', 'order')),
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'sent', 'accepted', 'rejected', 'exported', 'cancelled'
        )),
    reference_code text,
    currency char(3) NOT NULL DEFAULT 'EUR',
    subtotal numeric(14, 2) NOT NULL DEFAULT 0,
    tax_total numeric(14, 2) NOT NULL DEFAULT 0,
    total numeric(14, 2) NOT NULL DEFAULT 0,
    notes text,
    exported_at timestamptz,
    export_format text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commercial_documents_org_status_idx
    ON platform.commercial_documents (org_id, status);
CREATE INDEX commercial_documents_contact_idx
    ON platform.commercial_documents (contact_id);

CREATE TABLE platform.commercial_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL
        REFERENCES platform.commercial_documents (id) ON DELETE CASCADE,
    sort_order int NOT NULL DEFAULT 0,
    description text NOT NULL,
    quantity numeric(14, 4) NOT NULL DEFAULT 1,
    unit_price numeric(14, 4) NOT NULL DEFAULT 0,
    tax_rate numeric(5, 2) NOT NULL DEFAULT 21,
    line_total numeric(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX commercial_lines_document_idx
    ON platform.commercial_lines (document_id, sort_order);

CREATE TABLE platform.external_invoice_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    contact_id uuid REFERENCES platform.contacts (id) ON DELETE SET NULL,
    commercial_document_id uuid
        REFERENCES platform.commercial_documents (id) ON DELETE SET NULL,
    external_system text NOT NULL,
    external_ref text,
    external_url text,
    invoiced_at date NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX external_invoice_org_contact_idx
    ON platform.external_invoice_records (org_id, contact_id);

-- C — Eventos y webhooks

CREATE TABLE platform.system_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    event_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX system_events_org_created_idx
    ON platform.system_events (org_id, created_at DESC);
CREATE INDEX system_events_org_type_idx
    ON platform.system_events (org_id, event_type);

CREATE TABLE platform.webhook_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES platform.organizations (id) ON DELETE CASCADE,
    url text NOT NULL,
    secret text,
    event_types text[] NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhook_subscriptions_org_active_idx
    ON platform.webhook_subscriptions (org_id, is_active);
