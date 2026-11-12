-- Ejecutar en el SQL Editor de Supabase. Precios en PEN, stock en unidades por variante (talla + color).
create extension if not exists pgcrypto;

create table if not exists admins (
 id uuid primary key default gen_random_uuid(), name varchar(120) not null,
 email varchar(254) not null unique, password_hash text not null,
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists categories (
 id uuid primary key default gen_random_uuid(), name varchar(100) not null unique,
 slug varchar(120) not null unique, description text, active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists brands (
 id uuid primary key default gen_random_uuid(), name varchar(120) not null unique,
 slug varchar(140) not null unique, active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists products (
 id uuid primary key default gen_random_uuid(), brand_id uuid not null references brands(id),
 category_id uuid not null references categories(id), name varchar(180) not null,
 slug varchar(220) not null unique, description text not null default '',
 fit varchar(80), -- corte: Oversize, Regular, Slim...
 gender varchar(32) not null default 'unisex' check (gender in ('unisex','hombre','mujer')),
 material text, care text, featured boolean not null default false,
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
 url text not null, storage_path text, alt_text varchar(250), position integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists product_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
 size varchar(20) not null, color varchar(40) not null,
 sku varchar(80) not null unique,
 price numeric(12,2) not null check (price >= 0),
 compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
 stock integer not null default 0 check (stock >= 0), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(product_id,size,color)
);
create table if not exists refresh_tokens (
 id uuid primary key default gen_random_uuid(), admin_id uuid not null references admins(id) on delete cascade,
 token_hash varchar(64) not null unique, family_id uuid not null,
 expires_at timestamptz not null, revoked_at timestamptz, replaced_by uuid,
 created_at timestamptz not null default now()
);
create index if not exists idx_refresh_admin on refresh_tokens(admin_id);
create index if not exists idx_products_filters on products(category_id,brand_id,active);
create index if not exists idx_variants_product on product_variants(product_id);
create index if not exists idx_images_product on product_images(product_id,position);

insert into categories (name,slug,description) values
 ('Polos','polos','Básicos y gráficos para todos los días'),
 ('Hoodies','hoodies','Polerones y buzos de corte oversize'),
 ('Casacas','casacas','Capas exteriores para la calle'),
 ('Pantalones','pantalones','Joggers, cargo y denim'),
 ('Accesorios','accesorios','Gorras, mochilas y detalles')
on conflict (slug) do nothing;
insert into brands (name,slug) values ('DSM Style Lab','dsm-style-lab') on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dsm-products','dsm-products',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- La API escribe con service_role solo desde el servidor. No hay políticas públicas de escritura.
