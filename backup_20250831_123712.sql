--
-- PostgreSQL database dump
--

\restrict f6VsM4BQafarvZjKZoEb8Mf1TnoizeY4X1E74biXGp38jrbPCLPTL9A4hOojttc

-- Dumped from database version 15.14 (Homebrew)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: anitha
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO anitha;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: anitha
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssetLedger; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."AssetLedger" AS ENUM (
    'XRPL',
    'HEDERA',
    'ETHEREUM'
);


ALTER TYPE public."AssetLedger" OWNER TO anitha;

--
-- Name: AssetNetwork; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."AssetNetwork" AS ENUM (
    'MAINNET',
    'TESTNET',
    'DEVNET'
);


ALTER TYPE public."AssetNetwork" OWNER TO anitha;

--
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'RETIRED'
);


ALTER TYPE public."AssetStatus" OWNER TO anitha;

--
-- Name: AuthorizationStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."AuthorizationStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'VALIDATED',
    'FAILED',
    'EXPIRED'
);


ALTER TYPE public."AuthorizationStatus" OWNER TO anitha;

--
-- Name: ComplianceMode; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."ComplianceMode" AS ENUM (
    'OFF',
    'RECORD_ONLY',
    'GATED_BEFORE'
);


ALTER TYPE public."ComplianceMode" OWNER TO anitha;

--
-- Name: ComplianceStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."ComplianceStatus" AS ENUM (
    'UNVERIFIED',
    'VERIFIED',
    'REJECTED'
);


ALTER TYPE public."ComplianceStatus" OWNER TO anitha;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Asset; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    "assetRef" text NOT NULL,
    ledger public."AssetLedger" NOT NULL,
    network public."AssetNetwork" NOT NULL,
    issuer text NOT NULL,
    code text NOT NULL,
    decimals integer NOT NULL,
    "complianceMode" public."ComplianceMode" DEFAULT 'RECORD_ONLY'::public."ComplianceMode" NOT NULL,
    controls jsonb,
    registry jsonb,
    metadata jsonb,
    status public."AssetStatus" DEFAULT 'DRAFT'::public."AssetStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Asset" OWNER TO anitha;

--
-- Name: Authorization; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Authorization" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    holder text NOT NULL,
    "limit" text NOT NULL,
    "txId" text,
    explorer text,
    status public."AuthorizationStatus" DEFAULT 'PENDING'::public."AuthorizationStatus" NOT NULL,
    "validatedAt" timestamp(3) without time zone,
    "validatedLedgerIndex" bigint,
    "failureCode" text,
    "noRipple" boolean DEFAULT false NOT NULL,
    "requireAuth" boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Authorization" OWNER TO anitha;

--
-- Name: ComplianceRecord; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."ComplianceRecord" (
    id text NOT NULL,
    "recordId" text NOT NULL,
    "assetId" text NOT NULL,
    holder text NOT NULL,
    sha256 text NOT NULL,
    status public."ComplianceStatus" DEFAULT 'UNVERIFIED'::public."ComplianceStatus" NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    reason text,
    isin text,
    "legalIssuer" text,
    jurisdiction text,
    "micaClass" text,
    "kycRequirement" text,
    "transferRestrictions" boolean DEFAULT false NOT NULL,
    purpose text,
    docs jsonb,
    "consentTs" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ComplianceRecord" OWNER TO anitha;

--
-- Name: Issuance; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Issuance" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "to" text NOT NULL,
    amount text NOT NULL,
    "complianceRef" jsonb,
    anchor boolean DEFAULT true NOT NULL,
    "txId" text,
    explorer text,
    status text DEFAULT 'pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "failureCode" text,
    "validatedAt" timestamp(3) without time zone,
    "validatedLedgerIndex" bigint
);


ALTER TABLE public."Issuance" OWNER TO anitha;

--
-- Name: User; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    sub text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    "twoFactorSecret" text,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO anitha;

--
-- Name: UserSettings; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."UserSettings" (
    id text NOT NULL,
    "userId" text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    notifications jsonb DEFAULT '{}'::jsonb NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserSettings" OWNER TO anitha;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO anitha;

--
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Asset" (id, "assetRef", ledger, network, issuer, code, decimals, "complianceMode", controls, registry, metadata, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Authorization; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Authorization" (id, "assetId", holder, "limit", "txId", explorer, status, "validatedAt", "validatedLedgerIndex", "failureCode", "noRipple", "requireAuth", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ComplianceRecord; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."ComplianceRecord" (id, "recordId", "assetId", holder, sha256, status, "verifiedAt", "verifiedBy", reason, isin, "legalIssuer", jurisdiction, "micaClass", "kycRequirement", "transferRestrictions", purpose, docs, "consentTs", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Issuance; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Issuance" (id, "assetId", "to", amount, "complianceRef", anchor, "txId", explorer, status, "createdAt", "updatedAt", "failureCode", "validatedAt", "validatedLedgerIndex") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."User" (id, email, name, sub, role, "twoFactorSecret", "twoFactorEnabled", "createdAt", "updatedAt") FROM stdin;
cmeyoxre20000759x28bkocb3	anitha.ramaswamy.2015@gmail.com	Anitha Ramaswamy	104629482050741817573	user	\N	f	2025-08-30 20:04:58.73	2025-08-30 20:04:58.73
cmeyp0f1d00003dz6d5n1b0j0	povordinary@gmail.com	Ordinary Pov	115606880869302730446	user	\N	f	2025-08-30 20:07:02.69	2025-08-30 20:07:02.69
cmezjiy930000h1lqrt76hjep	aramaswa2005@gmail.com	Anitha Ramaswamy	100259940519902529407	user	JICBMPLIDVIBGKJ2	t	2025-08-31 10:21:15.879	2025-08-31 10:22:19.379
\.


--
-- Data for Name: UserSettings; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."UserSettings" (id, "userId", timezone, language, theme, notifications, preferences, "createdAt", "updatedAt") FROM stdin;
cmeyqkt6y00014jxoc8d7fhpy	cmeyp0f1d00003dz6d5n1b0j0	America/New_York	en	light	{"push": false, "email": false, "security": true}	{}	2025-08-30 20:50:53.771	2025-08-30 20:52:04.541
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
246410f1-8dfa-4312-8541-2392739afb49	37ff7e38f0b28b34f7f9c23921a21e6d38c71d948acb17ac7032e67bd700f55c	2025-08-30 22:00:19.002089+02	20250824182937_token_registry_enum_pg	\N	\N	2025-08-30 22:00:18.990489+02	1
fea784b4-c293-4ca0-b9d0-81dc020448ee	4eb5192fcb85feb6ebd7a6ad586d4435502e810aa5c47fd63a67837770504ac8	2025-08-30 22:00:19.008046+02	20250826204441_add_user_2fa	\N	\N	2025-08-30 22:00:19.002591+02	1
f8ea6c0e-3ed0-4f4c-983d-957ec75b2590	8ea947cdf806225e56d40f3efa43ca212ff136d57002c2554b9759cabfc7b81d	2025-08-30 22:00:19.017167+02	20250828155201_add_asset_models	\N	\N	2025-08-30 22:00:19.008459+02	1
7b35a5ef-aaa1-4175-ad0a-1dc4d8579662	92721a87eb00bf0bf360d1cc13580522e23856c3d6276a19f801677cb201ea04	2025-08-30 22:00:19.020572+02	20250828182812_remove_legacy_tables	\N	\N	2025-08-30 22:00:19.017916+02	1
45467c86-f292-4a1a-879b-cf86009922d4	f93104cccf7ca1d520f78db8829cbd60beb896dea2d36d3fa2152bf86e4a9bea	2025-08-30 22:00:19.025681+02	20250829080313_add_compliance_records	\N	\N	2025-08-30 22:00:19.020997+02	1
e1abc448-670c-437e-acd0-ba70857b2e4e	f1073bbaf1ab3cd2dcdfc45ee65e07e02dce53c57cdfeca2f7b10913452ccf99	2025-08-30 22:00:19.02674+02	20250829114829_add_issuance_status_tracking	\N	\N	2025-08-30 22:00:19.026078+02	1
083c0533-d9ae-400d-9dec-0d5b59d86959	cbc9c66d16c1fd8818c82bb42d08206f61f4a56b7a49ee66dabfae2e24fca032	2025-08-30 22:00:19.03114+02	20250829142636_add_authorization_model	\N	\N	2025-08-30 22:00:19.027078+02	1
bb357192-df2f-42ba-baa0-a34c67036c3e	9bf1f0dc00780dce8d0e631ae99b92f9ea84b1db795595c6c4ff2425557064b4	2025-08-30 22:00:19.034488+02	20250830192039_add_user_settings	\N	\N	2025-08-30 22:00:19.031535+02	1
\.


--
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);


--
-- Name: Authorization Authorization_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Authorization"
    ADD CONSTRAINT "Authorization_pkey" PRIMARY KEY (id);


--
-- Name: ComplianceRecord ComplianceRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY (id);


--
-- Name: Issuance Issuance_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Issuance"
    ADD CONSTRAINT "Issuance_pkey" PRIMARY KEY (id);


--
-- Name: UserSettings UserSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Asset_assetRef_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "Asset_assetRef_key" ON public."Asset" USING btree ("assetRef");


--
-- Name: Asset_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Asset_createdAt_idx" ON public."Asset" USING btree ("createdAt");


--
-- Name: Asset_ledger_network_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Asset_ledger_network_idx" ON public."Asset" USING btree (ledger, network);


--
-- Name: Asset_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Asset_status_idx" ON public."Asset" USING btree (status);


--
-- Name: Authorization_assetId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Authorization_assetId_idx" ON public."Authorization" USING btree ("assetId");


--
-- Name: Authorization_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Authorization_createdAt_idx" ON public."Authorization" USING btree ("createdAt");


--
-- Name: Authorization_holder_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Authorization_holder_idx" ON public."Authorization" USING btree (holder);


--
-- Name: Authorization_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Authorization_status_idx" ON public."Authorization" USING btree (status);


--
-- Name: ComplianceRecord_assetId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "ComplianceRecord_assetId_idx" ON public."ComplianceRecord" USING btree ("assetId");


--
-- Name: ComplianceRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "ComplianceRecord_createdAt_idx" ON public."ComplianceRecord" USING btree ("createdAt");


--
-- Name: ComplianceRecord_holder_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "ComplianceRecord_holder_idx" ON public."ComplianceRecord" USING btree (holder);


--
-- Name: ComplianceRecord_recordId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "ComplianceRecord_recordId_idx" ON public."ComplianceRecord" USING btree ("recordId");


--
-- Name: ComplianceRecord_recordId_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "ComplianceRecord_recordId_key" ON public."ComplianceRecord" USING btree ("recordId");


--
-- Name: ComplianceRecord_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "ComplianceRecord_status_idx" ON public."ComplianceRecord" USING btree (status);


--
-- Name: Issuance_assetId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Issuance_assetId_idx" ON public."Issuance" USING btree ("assetId");


--
-- Name: Issuance_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Issuance_createdAt_idx" ON public."Issuance" USING btree ("createdAt");


--
-- Name: Issuance_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Issuance_status_idx" ON public."Issuance" USING btree (status);


--
-- Name: UserSettings_userId_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "UserSettings_userId_key" ON public."UserSettings" USING btree ("userId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_sub_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "User_sub_idx" ON public."User" USING btree (sub);


--
-- Name: User_sub_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "User_sub_key" ON public."User" USING btree (sub);


--
-- Name: Authorization Authorization_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Authorization"
    ADD CONSTRAINT "Authorization_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ComplianceRecord ComplianceRecord_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Issuance Issuance_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Issuance"
    ADD CONSTRAINT "Issuance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSettings UserSettings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: anitha
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict f6VsM4BQafarvZjKZoEb8Mf1TnoizeY4X1E74biXGp38jrbPCLPTL9A4hOojttc

