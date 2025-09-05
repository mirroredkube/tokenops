--
-- PostgreSQL database dump
--

\restrict CquLZYb5YBiTxM54uFoJCK3tFS7TPoKeBdkP3etxO9WbiH7NeZHbpdC4G3I9oe2

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
-- Name: AssetClass; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."AssetClass" AS ENUM (
    'ART',
    'EMT',
    'OTHER'
);


ALTER TYPE public."AssetClass" OWNER TO anitha;

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
-- Name: IssuanceStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."IssuanceStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'VALIDATED',
    'FAILED',
    'EXPIRED'
);


ALTER TYPE public."IssuanceStatus" OWNER TO anitha;

--
-- Name: IssuerAddressStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."IssuerAddressStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'SUSPENDED',
    'REVOKED'
);


ALTER TYPE public."IssuerAddressStatus" OWNER TO anitha;

--
-- Name: OrganizationStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."OrganizationStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'INACTIVE'
);


ALTER TYPE public."OrganizationStatus" OWNER TO anitha;

--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'RETIRED'
);


ALTER TYPE public."ProductStatus" OWNER TO anitha;

--
-- Name: RequirementStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."RequirementStatus" AS ENUM (
    'REQUIRED',
    'SATISFIED',
    'EXCEPTION'
);


ALTER TYPE public."RequirementStatus" OWNER TO anitha;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'COMPLIANCE_OFFICER',
    'AUDITOR',
    'ISSUER_ADMIN',
    'COMPLIANCE_REVIEWER',
    'OPERATOR',
    'VIEWER'
);


ALTER TYPE public."UserRole" OWNER TO anitha;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: anitha
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'INACTIVE'
);


ALTER TYPE public."UserStatus" OWNER TO anitha;

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
    code text NOT NULL,
    decimals integer NOT NULL,
    "complianceMode" public."ComplianceMode" DEFAULT 'RECORD_ONLY'::public."ComplianceMode" NOT NULL,
    controls jsonb,
    registry jsonb,
    metadata jsonb,
    status public."AssetStatus" DEFAULT 'DRAFT'::public."AssetStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "productId" text NOT NULL,
    "issuingAddressId" text,
    "assetClass" public."AssetClass" DEFAULT 'OTHER'::public."AssetClass" NOT NULL
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "issuanceId" text
);


ALTER TABLE public."Authorization" OWNER TO anitha;

--
-- Name: Event; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    "organizationId" text,
    "productId" text,
    "assetId" text,
    "issuerAddressId" text,
    "regimeId" text,
    "requirementTemplateId" text,
    "requirementInstanceId" text,
    "userId" text,
    "eventType" text NOT NULL,
    "eventData" jsonb,
    rationale text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Event" OWNER TO anitha;

--
-- Name: Evidence; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Evidence" (
    id text NOT NULL,
    "requirementInstanceId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileType" text NOT NULL,
    "fileSize" integer NOT NULL,
    "fileHash" character varying(64) NOT NULL,
    "uploadPath" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    tags text[],
    metadata jsonb
);


ALTER TABLE public."Evidence" OWNER TO anitha;

--
-- Name: Issuance; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Issuance" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    amount text NOT NULL,
    "complianceRef" jsonb,
    anchor boolean DEFAULT false NOT NULL,
    "txId" text,
    explorer text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "complianceEvaluated" boolean DEFAULT false NOT NULL,
    "complianceStatus" text,
    holder text NOT NULL,
    "manifestHash" character varying(66),
    "manifestVersion" text DEFAULT '1.0'::text NOT NULL,
    status public."IssuanceStatus" DEFAULT 'PENDING'::public."IssuanceStatus" NOT NULL
);


ALTER TABLE public."Issuance" OWNER TO anitha;

--
-- Name: IssuerAddress; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."IssuerAddress" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    address text NOT NULL,
    ledger public."AssetLedger" NOT NULL,
    network public."AssetNetwork" NOT NULL,
    "allowedUseTags" text[],
    status public."IssuerAddressStatus" DEFAULT 'PENDING'::public."IssuerAddressStatus" NOT NULL,
    "proofOfControl" jsonb,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "suspendedAt" timestamp(3) without time zone,
    "suspendedBy" text,
    reason text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."IssuerAddress" OWNER TO anitha;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    "legalName" character varying(200),
    country character(2) NOT NULL,
    jurisdiction character varying(100),
    "taxId" character varying(50),
    website character varying(255),
    status public."OrganizationStatus" DEFAULT 'ACTIVE'::public."OrganizationStatus" NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Organization" OWNER TO anitha;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500),
    "assetClass" public."AssetClass" DEFAULT 'OTHER'::public."AssetClass" NOT NULL,
    "policyPresets" jsonb,
    documents jsonb,
    "targetMarkets" text[],
    status public."ProductStatus" DEFAULT 'DRAFT'::public."ProductStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO anitha;

--
-- Name: Regime; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."Regime" (
    id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    description text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Regime" OWNER TO anitha;

--
-- Name: RequirementInstance; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."RequirementInstance" (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "requirementTemplateId" text NOT NULL,
    status public."RequirementStatus" DEFAULT 'REQUIRED'::public."RequirementStatus" NOT NULL,
    "evidenceRefs" jsonb,
    "verifierId" text,
    "verifiedAt" timestamp(3) without time zone,
    rationale text,
    "exceptionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    holder text,
    "issuanceId" text,
    "transferAmount" text,
    "transferType" text,
    notes text,
    "platformAcknowledged" boolean DEFAULT false NOT NULL,
    "platformAcknowledgedAt" timestamp(3) without time zone,
    "platformAcknowledgedBy" text,
    "platformAcknowledgmentReason" text
);


ALTER TABLE public."RequirementInstance" OWNER TO anitha;

--
-- Name: RequirementTemplate; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."RequirementTemplate" (
    id text NOT NULL,
    "regimeId" text NOT NULL,
    name text NOT NULL,
    description text,
    "applicabilityExpr" text NOT NULL,
    "dataPoints" text[],
    "enforcementHints" jsonb,
    version text DEFAULT '1.0'::text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "effectiveTo" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RequirementTemplate" OWNER TO anitha;

--
-- Name: User; Type: TABLE; Schema: public; Owner: anitha
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    sub text NOT NULL,
    "twoFactorSecret" text,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "organizationId" text NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    role public."UserRole" DEFAULT 'VIEWER'::public."UserRole" NOT NULL
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

COPY public."Asset" (id, "assetRef", ledger, network, code, decimals, "complianceMode", controls, registry, metadata, status, "createdAt", "updatedAt", "productId", "issuingAddressId", "assetClass") FROM stdin;
cmf5op24e00053gnqm3xy132h	xrpl:testnet/iou:rCorrectOrgAddress123456789.TEST-ASSET-003	XRPL	TESTNET	TEST-ASSET-003	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-09-04 17:32:35.966	2025-09-04 17:32:35.966	cmf1gg9y00001gpfh2elklt7z	cmf5ooq8t00033gnq0t342bce	ART
cmf527r900001xwl9f8ke7mxg	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.ABCD	XRPL	TESTNET	ABCD	6	GATED_BEFORE	\N	\N	\N	ACTIVE	2025-09-02 16:23:30.765	2025-09-02 16:54:46.332	cmf1gg9y00001gpfh2elklt7z	\N	ART
cmf540hmx0001bky8fuzfwgv5	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.COMPART	XRPL	TESTNET	COMPART	6	GATED_BEFORE	\N	\N	\N	DRAFT	2025-09-04 07:53:37.353	2025-09-04 07:53:37.353	cmf1gg9y00001gpfh2elklt7z	\N	ART
cmf5pn47f0003nj9jlddysmpu	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.SHITCOIN	XRPL	TESTNET	SHITCOIN	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-09-04 17:59:04.971	2025-09-04 17:59:04.971	cmf1gg9y00001gpfh2elklt7z	cmf5pifp00001nj9jj7luns02	OTHER
\.


--
-- Data for Name: Authorization; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Authorization" (id, "assetId", holder, "limit", "txId", explorer, status, "validatedAt", "validatedLedgerIndex", "failureCode", "noRipple", "requireAuth", metadata, "createdAt", "updatedAt", "issuanceId") FROM stdin;
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Event" (id, "organizationId", "productId", "assetId", "issuerAddressId", "regimeId", "requirementTemplateId", "requirementInstanceId", "userId", "eventType", "eventData", rationale, "createdAt") FROM stdin;
\.


--
-- Data for Name: Evidence; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Evidence" (id, "requirementInstanceId", "fileName", "fileType", "fileSize", "fileHash", "uploadPath", "uploadedBy", "uploadedAt", description, tags, metadata) FROM stdin;
\.


--
-- Data for Name: Issuance; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Issuance" (id, "assetId", amount, "complianceRef", anchor, "txId", explorer, "createdAt", "updatedAt", "complianceEvaluated", "complianceStatus", holder, "manifestHash", "manifestVersion", status) FROM stdin;
iss_1757006343350_ucrwtdzm5	cmf527r900001xwl9f8ke7mxg	10	{"org_id": "cmf1gbx2v00001u4z8kg5ktml", "asset_id": "cmf527r900001xwl9f8ke7mxg", "timestamp": "2025-09-04T17:19:03.374Z", "product_id": "cmf1gg9y00001gpfh2elklt7z", "issuance_facts": {"isin": "EU0808", "amount": "10", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw", "purpose": "Utility", "mica_class": "utility_token", "jurisdiction": "DE", "legal_issuer": "ABC ", "kyc_requirement": "optional", "transfer_restrictions": "false"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "GATED_BEFORE"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "SATISFIED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf5o7n440001j0gegc2gesh4", "requirement_template_id": "xrpl-trustline-auth"}, {"status": "SATISFIED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf5o7n440003j0gecnqpogp3", "requirement_template_id": "travel-rule-payload"}]}	t	4EA8927F6901A784926F702FCDAAFBEC46D7B9644E0CD2AB7B0B60FAD53F62EA	https://testnet.xrpl.org/transactions/4EA8927F6901A784926F702FCDAAFBEC46D7B9644E0CD2AB7B0B60FAD53F62EA	2025-09-04 17:19:03.351	2025-09-04 17:19:11.826	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	014bb6e327a6bc5b1f54941c0f061d48ecd7241910f2403fcd54adc164f790f3	1.0	VALIDATED
\.


--
-- Data for Name: IssuerAddress; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."IssuerAddress" (id, "organizationId", address, ledger, network, "allowedUseTags", status, "proofOfControl", "approvedAt", "approvedBy", "suspendedAt", "suspendedBy", reason, metadata, "createdAt", "updatedAt") FROM stdin;
cmezwe5mv0003z09mpau1u6z5	cmezwdpgz0000r00xlgcyby82	rTestIssuer123456789	XRPL	TESTNET	{OTHER}	APPROVED	\N	\N	\N	\N	\N	\N	\N	2025-08-31 16:21:27.176	2025-08-31 16:21:27.176
cmf5on7zw00013gnqyqlk1p6i	cmezwdpgz0000r00xlgcyby82	rNewTestAddress123456789	XRPL	TESTNET	{ART,EMT}	APPROVED	\N	2025-09-04 17:31:21.017	system	\N	\N	Address verified and approved for ART/EMT token issuance	\N	2025-09-04 17:31:10.268	2025-09-04 17:31:21.017
cmf5ooq8t00033gnq0t342bce	cmf1gbx2v00001u4z8kg5ktml	rCorrectOrgAddress123456789	XRPL	TESTNET	{ART,EMT}	SUSPENDED	\N	2025-09-04 17:32:27.626	system	2025-09-04 17:53:14.397	system	asdasdf	\N	2025-09-04 17:32:20.573	2025-09-04 17:53:14.398
cmf5pifp00001nj9jj7luns02	cmf1gbx2v00001u4z8kg5ktml	rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX	XRPL	TESTNET	{OTHER}	APPROVED	\N	2025-09-04 17:55:50.752	system	\N	\N	Approved	\N	2025-09-04 17:55:26.581	2025-09-04 17:55:50.753
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Organization" (id, name, "legalName", country, jurisdiction, "taxId", website, status, metadata, "createdAt", "updatedAt") FROM stdin;
cmezwdpgz0000r00xlgcyby82	Default Organization	Default Organization	US	US	\N	\N	ACTIVE	\N	2025-08-31 16:21:06.228	2025-08-31 16:21:06.228
cmf1gbx2v00001u4z8kg5ktml	TokenOps Corp	TokenOps Corporation	DE	Germany	12-3456789	https://tokenops.com	ACTIVE	{"founded": "2024", "industry": "Financial Technology", "description": "Leading provider of tokenization and compliance solutions"}	2025-09-01 18:27:21.271	2025-09-01 20:01:11.514
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Product" (id, "organizationId", name, description, "assetClass", "policyPresets", documents, "targetMarkets", status, "createdAt", "updatedAt") FROM stdin;
cmezwdysd0001z09meu49f71j	cmezwdpgz0000r00xlgcyby82	Test Compliance Product	A test product for compliance integration	ART	\N	\N	{US,EU}	DRAFT	2025-08-31 16:21:18.301	2025-08-31 16:21:18.301
cmf1gg9y00001gpfh2elklt7z	cmf1gbx2v00001u4z8kg5ktml	TokenOps Platform	Enterprise-grade tokenization and compliance platform	OTHER	["mica-kyc-tier-art-emt"]	["platform-whitepaper.pdf"]	{US,EU,Global}	ACTIVE	2025-09-01 18:30:44.569	2025-09-01 18:30:44.569
\.


--
-- Data for Name: Regime; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Regime" (id, name, version, "effectiveFrom", "effectiveTo", description, metadata, "createdAt", "updatedAt") FROM stdin;
mica-eu-v1	EU: MiCA	1.0	2024-12-30 00:00:00	\N	Markets in Crypto-Assets Regulation (EU) 2023/1114	{"scope": "Crypto-asset service providers and issuers", "authority": "European Securities and Markets Authority (ESMA)", "jurisdiction": "EU"}	2025-08-31 10:48:45.966	2025-08-31 10:48:45.966
travel-rule-eu-v1	EU: Travel Rule	1.0	2024-12-30 00:00:00	\N	Regulation (EU) 2023/1113 on information accompanying transfers of funds and certain crypto-assets	{"scope": "Crypto-asset transfers", "authority": "European Banking Authority (EBA)", "jurisdiction": "EU"}	2025-08-31 10:48:45.972	2025-08-31 10:48:45.972
\.


--
-- Data for Name: RequirementInstance; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."RequirementInstance" (id, "assetId", "requirementTemplateId", status, "evidenceRefs", "verifierId", "verifiedAt", rationale, "exceptionReason", "createdAt", "updatedAt", holder, "issuanceId", "transferAmount", "transferType", notes, "platformAcknowledged", "platformAcknowledgedAt", "platformAcknowledgedBy", "platformAcknowledgmentReason") FROM stdin;
cmf53s202000312sz6cxat2g8	cmf527r900001xwl9f8ke7mxg	xrpl-trustline-auth	SATISFIED	\N	\N	2025-09-04 16:49:37.148	XRPL requires trustline authorization	\N	2025-09-04 07:47:03.842	2025-09-04 16:49:37.154	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf540hnk000dbky80plz8y7h	cmf540hmx0001bky8fuzfwgv5	xrpl-trustline-auth	SATISFIED	\N	\N	2025-09-04 16:50:38.767	XRPL requires trustline authorization	\N	2025-09-04 07:53:37.376	2025-09-04 16:50:38.768	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf540hnj000bbky80y77a33a	cmf540hmx0001bky8fuzfwgv5	travel-rule-payload	EXCEPTION	\N	\N	2025-09-04 16:51:55.401	CASP-to-CASP transfers require travel rule information	Exception marked by user	2025-09-04 07:53:37.375	2025-09-04 16:51:55.402	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf540hnh0007bky87j0cvg0q	cmf540hmx0001bky8fuzfwgv5	mica-kyc-tier-art-emt	EXCEPTION	\N	\N	2025-09-04 16:53:21.838	Asset-Referenced Token requires KYC verification	User provided custom reason	2025-09-04 07:53:37.373	2025-09-04 16:53:21.839	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf540hni0009bky8ams8vdia	cmf540hmx0001bky8fuzfwgv5	mica-marketing-communications	EXCEPTION	\N	\N	2025-09-04 16:54:02.028	Asset-Referenced Token marketing requires compliance with MiCA	Allowed in EU with an exception	2025-09-04 07:53:37.374	2025-09-04 16:54:02.029	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf540hng0005bky8zp7xm2ti	cmf540hmx0001bky8fuzfwgv5	mica-whitepaper-art	SATISFIED	\N	\N	2025-09-04 16:54:38.147	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-09-04 07:53:37.372	2025-09-04 16:54:38.147	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf540hnc0003bky8cmshc5xq	cmf540hmx0001bky8fuzfwgv5	mica-issuer-auth-art-emt	SATISFIED	\N	\N	2025-09-04 16:54:41.895	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-09-04 07:53:37.369	2025-09-04 16:54:41.895	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf53s1zy000112sza4m28ifb	cmf527r900001xwl9f8ke7mxg	travel-rule-payload	SATISFIED	\N	\N	2025-09-04 17:02:04.562	CASP-to-CASP transfers require travel rule information	\N	2025-09-04 07:47:03.839	2025-09-04 17:02:04.563	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5o7n440001j0gegc2gesh4	cmf527r900001xwl9f8ke7mxg	xrpl-trustline-auth	SATISFIED	null	\N	2025-09-04 16:49:37.148	XRPL requires trustline authorization	\N	2025-09-04 17:19:03.361	2025-09-04 17:19:03.361	\N	iss_1757006343350_ucrwtdzm5	\N	\N	\N	f	\N	\N	\N
cmf5o7n440003j0gecnqpogp3	cmf527r900001xwl9f8ke7mxg	travel-rule-payload	SATISFIED	null	\N	2025-09-04 17:02:04.562	CASP-to-CASP transfers require travel rule information	\N	2025-09-04 17:19:03.361	2025-09-04 17:19:03.361	\N	iss_1757006343350_ucrwtdzm5	\N	\N	\N	f	\N	\N	\N
cmf5op24r00073gnq0bj14ooc	cmf5op24e00053gnqm3xy132h	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-09-04 17:32:35.98	2025-09-04 17:32:35.98	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5op24v00093gnqhh4dywum	cmf5op24e00053gnqm3xy132h	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-09-04 17:32:35.983	2025-09-04 17:32:35.983	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5op24v000b3gnquzttw2ks	cmf5op24e00053gnqm3xy132h	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-09-04 17:32:35.984	2025-09-04 17:32:35.984	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5op24w000d3gnqzniz30nv	cmf5op24e00053gnqm3xy132h	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-09-04 17:32:35.985	2025-09-04 17:32:35.985	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5op24x000f3gnqmahi8m13	cmf5op24e00053gnqm3xy132h	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-04 17:32:35.986	2025-09-04 17:32:35.986	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5op24y000h3gnqen77lc6e	cmf5op24e00053gnqm3xy132h	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-09-04 17:32:35.987	2025-09-04 17:32:35.987	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5pn4820005nj9jhv4d24ki	cmf5pn47f0003nj9jlddysmpu	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-04 17:59:04.994	2025-09-04 17:59:04.994	\N	\N	\N	\N	\N	f	\N	\N	\N
cmf5pn4880007nj9jfbqgje2v	cmf5pn47f0003nj9jlddysmpu	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-09-04 17:59:05.001	2025-09-04 17:59:05.001	\N	\N	\N	\N	\N	f	\N	\N	\N
\.


--
-- Data for Name: RequirementTemplate; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."RequirementTemplate" (id, "regimeId", name, description, "applicabilityExpr", "dataPoints", "enforcementHints", version, "effectiveFrom", "effectiveTo", "createdAt", "updatedAt") FROM stdin;
mica-issuer-auth-art-emt	mica-eu-v1	Issuer Authorization (ART/EMT)	Authorization to issue Asset-Referenced Tokens or E-Money Tokens under MiCA	assetClass == 'ART' || assetClass == 'EMT'	{authorizationDocument,authorityName,authorizationDate}	{"evm": {"pauseControl": true, "allowlistGating": true}, "xrpl": {"requireAuth": true, "trustlineAuthorization": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.973	2025-08-31 10:48:45.973
mica-whitepaper-art	mica-eu-v1	Crypto-Asset White Paper (ART)	White paper requirement for Asset-Referenced Tokens under MiCA Article 6	assetClass == 'ART'	{whitePaperUrl,whitePaperHash,issuerName,issuerAddress}	{"evm": {"allowlistGating": true}, "xrpl": {"requireAuth": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.976	2025-08-31 10:48:45.976
mica-kyc-tier-art-emt	mica-eu-v1	KYC Requirements by Asset Class	Know Your Customer requirements based on asset class	assetClass == 'ART' || assetClass == 'EMT'	{kycTier,kycProvider,kycPolicy}	{"evm": {"allowlistGating": true}, "xrpl": {"trustlineAuthorization": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.978	2025-08-31 10:48:45.978
mica-right-of-withdrawal	mica-eu-v1	Right of Withdrawal (Art. 13)	Right of withdrawal for retail investors under MiCA Article 13	assetClass == 'ART' && investorAudience == 'retail'	{withdrawalPeriod,withdrawalTerms,refundPolicy}	{"evm": {"pauseControl": true}, "xrpl": {"freezeControl": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.979	2025-08-31 10:48:45.979
mica-marketing-communications	mica-eu-v1	Marketing Communications	Requirements for marketing communications under MiCA	assetClass == 'ART' || assetClass == 'EMT'	{marketingPolicy,communicationGuidelines}	{"evm": {"allowlistGating": true}, "xrpl": {"requireAuth": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.98	2025-08-31 10:48:45.98
travel-rule-payload	travel-rule-eu-v1	Travel Rule Information Payload	Required information for crypto-asset transfers under EU Travel Rule	isCaspInvolved == true && transferType == 'CASP_TO_CASP'	{originatorName,originatorAddress,beneficiaryName,beneficiaryAddress,transferAmount}	{"evm": {"allowlistGating": true}, "xrpl": {"requireAuth": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.981	2025-08-31 10:48:45.981
travel-rule-self-hosted	travel-rule-eu-v1	Self-Hosted Wallet Transfers	Requirements for transfers involving self-hosted wallets	transferType == 'CASP_TO_SELF_HOSTED' || transferType == 'SELF_HOSTED_TO_CASP'	{walletAddress,transferAmount,riskAssessment}	{"evm": {"allowlistGating": true}, "xrpl": {"requireAuth": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.983	2025-08-31 10:48:45.983
xrpl-trustline-auth	mica-eu-v1	XRPL Trustline Authorization	Trustline authorization requirement for XRPL assets	ledger == 'XRPL'	{trustlineLimit,authorizationPolicy}	{"xrpl": {"requireAuth": true, "trustlineAuthorization": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.984	2025-08-31 10:48:45.984
evm-allowlist-gating	mica-eu-v1	EVM Allowlist Gating	Allowlist gating requirement for EVM assets	ledger == 'ETHEREUM' || ledger == 'HEDERA'	{allowlistPolicy,mintControl,transferControl}	{"evm": {"pauseControl": true, "allowlistGating": true}}	1.0	2024-12-30 00:00:00	\N	2025-08-31 10:48:45.985	2025-08-31 10:48:45.985
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."User" (id, email, name, sub, "twoFactorSecret", "twoFactorEnabled", "createdAt", "updatedAt", "organizationId", status, role) FROM stdin;
cmezwos390015ml46vg3x030v	anitha.ramaswamy.2015@gmail.com	Anitha Ramaswamy	104629482050741817573	\N	f	2025-08-31 16:29:42.838	2025-09-01 18:27:21.28	cmf1gbx2v00001u4z8kg5ktml	ACTIVE	VIEWER
cmf1g85lu0001yo0xpuw90xd0	povordinary@gmail.com	Ordinary Pov	115606880869302730446	\N	f	2025-09-01 18:24:25.697	2025-09-01 18:27:21.28	cmf1gbx2v00001u4z8kg5ktml	ACTIVE	VIEWER
cmf4clv120001rfxt6zis485n	gurubuffet@gmail.com	guru praveen	113684139800950631634	\N	f	2025-09-03 19:06:25.238	2025-09-03 19:06:25.238	cmezwdpgz0000r00xlgcyby82	ACTIVE	VIEWER
\.


--
-- Data for Name: UserSettings; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."UserSettings" (id, "userId", timezone, language, theme, notifications, preferences, "createdAt", "updatedAt") FROM stdin;
cmf2t2vj5000dqg0p2epk7nev	cmezwos390015ml46vg3x030v	UTC	en	light	{"push": false, "email": true, "security": true}	{}	2025-09-02 17:12:00.546	2025-09-02 17:12:00.546
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
246410f1-8dfa-4312-8541-2392739afb49	37ff7e38f0b28b34f7f9c23921a21e6d38c71d948acb17ac7032e67bd700f55c	2025-08-30 22:00:19.002089+02	20250824182937_token_registry_enum_pg	\N	\N	2025-08-30 22:00:18.990489+02	1
fea784b4-c293-4ca0-b9d0-81dc020448ee	4eb5192fcb85feb6ebd7a6ad586d4435502e810aa5c47fd63a67837770504ac8	2025-08-30 22:00:19.008046+02	20250826204441_add_user_2fa	\N	\N	2025-08-30 22:00:19.002591+02	1
d08f8ff5-c6cd-4400-9ca1-1eb8725caf77	6f661a4d5bf9302be8c7fcdde918669eeaefabe587ceb3e7f0539e3d210d49e8	2025-08-31 18:37:11.287387+02	20250831163711_migrate_compliance_to_requirement_instances	\N	\N	2025-08-31 18:37:11.279363+02	1
f8ea6c0e-3ed0-4f4c-983d-957ec75b2590	8ea947cdf806225e56d40f3efa43ca212ff136d57002c2554b9759cabfc7b81d	2025-08-30 22:00:19.017167+02	20250828155201_add_asset_models	\N	\N	2025-08-30 22:00:19.008459+02	1
7b35a5ef-aaa1-4175-ad0a-1dc4d8579662	92721a87eb00bf0bf360d1cc13580522e23856c3d6276a19f801677cb201ea04	2025-08-30 22:00:19.020572+02	20250828182812_remove_legacy_tables	\N	\N	2025-08-30 22:00:19.017916+02	1
45467c86-f292-4a1a-879b-cf86009922d4	f93104cccf7ca1d520f78db8829cbd60beb896dea2d36d3fa2152bf86e4a9bea	2025-08-30 22:00:19.025681+02	20250829080313_add_compliance_records	\N	\N	2025-08-30 22:00:19.020997+02	1
950e898f-322d-4bc0-8ffb-301815a7a953	27d385eef06360dc12130e6c6b3a5b8d60e4573bbda73285cdf12319aff21a03	2025-08-31 19:40:37.681116+02	20250831173849_unified_compliance_design	\N	\N	2025-08-31 19:40:37.674603+02	1
e1abc448-670c-437e-acd0-ba70857b2e4e	f1073bbaf1ab3cd2dcdfc45ee65e07e02dce53c57cdfeca2f7b10913452ccf99	2025-08-30 22:00:19.02674+02	20250829114829_add_issuance_status_tracking	\N	\N	2025-08-30 22:00:19.026078+02	1
083c0533-d9ae-400d-9dec-0d5b59d86959	cbc9c66d16c1fd8818c82bb42d08206f61f4a56b7a49ee66dabfae2e24fca032	2025-08-30 22:00:19.03114+02	20250829142636_add_authorization_model	\N	\N	2025-08-30 22:00:19.027078+02	1
bb357192-df2f-42ba-baa0-a34c67036c3e	9bf1f0dc00780dce8d0e631ae99b92f9ea84b1db795595c6c4ff2425557064b4	2025-08-30 22:00:19.034488+02	20250830192039_add_user_settings	\N	\N	2025-08-30 22:00:19.031535+02	1
f243fb75-cf3b-4a09-9c9c-9a7eaeec7aa6	2bd839c152d1b6fbff921d6b6c7d975a650b2ae7b099779c0dd71713713f6547	2025-08-31 19:40:55.630644+02	20250831174055_compliance_consolidation_for_asset_and_issuance	\N	\N	2025-08-31 19:40:55.629485+02	1
bd6093f4-3f13-4809-b611-b3b5de15ea87	7becd941052bcddd6628685528b7b9b541d208594d2d7e3ff43784c3b11e648a	2025-08-31 12:47:32.013235+02	20250831104625_add_organization_product_hierarchy	\N	\N	2025-08-31 12:47:31.980709+02	1
9c2edd3b-317b-4e77-ab1d-2aa89ea8ae1e	3f6d73ab2c70e17d9a0ff62df258f6b85d1b1bde9e070c12ba7bc4b3f661f5b4	2025-08-31 12:47:58.009769+02	20250831104758_add_organization	\N	\N	2025-08-31 12:47:58.005792+02	1
d042b586-80ef-4933-a993-331ac3006535	13537d38fc1cdb14cce5c066c62d0daf8f77c4a2de29de4665fb5b3f4a23d285	2025-08-31 13:39:01.485763+02	20250831113901_add_organization_constraints	\N	\N	2025-08-31 13:39:01.477793+02	1
e50e3d72-c9c3-4687-846d-aa996355a75c	ea579a0a0b05b3c58eb856b37579e65420f2172fa6d0f149553fa71b54ec702f	2025-09-01 22:10:51.023103+02	20250901201051_add_notes_to_requirement_instance	\N	\N	2025-09-01 22:10:51.022028+02	1
92ff19b5-b709-4760-82db-fc6b774e9dda	259f51159a7dd586894a46e593ba165f56e5687269b595d5952c992d895f152d	2025-08-31 13:40:15.170339+02	20250831114000_add_organization_check_constraints	\N	\N	2025-08-31 13:40:15.16852+02	1
b6b3c88d-941d-450a-a46b-65dbb62f5223	843f99ea72e12dce1d26ece7eb017da279366a5336f67abff182b99abf4ee606	2025-08-31 15:39:20.594366+02	20250831133911_add_product_constraints	\N	\N	2025-08-31 15:39:20.585749+02	1
56bd1415-0cf1-4f1e-9aba-a5e3b3f8f79e	a8e909acba8a0baaf89bd7c3bf69d2a2e0dcb62fc0caf3e6ba03e4296c4f94ed	2025-09-02 18:20:08.101787+02	20250902162008_add_asset_class_to_assets	\N	\N	2025-09-02 18:20:08.098972+02	1
bdea645f-1a45-432a-9914-dd65cf9f4969	135ea53ca657110cf0801cc8bc676c594ea75951ac31d89c28e9fa5b3322d755	\N	20250903192317_add_evidence_model	\N	\N	2025-09-03 21:23:17.865287+02	0
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
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: Evidence Evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_pkey" PRIMARY KEY (id);


--
-- Name: Issuance Issuance_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Issuance"
    ADD CONSTRAINT "Issuance_pkey" PRIMARY KEY (id);


--
-- Name: IssuerAddress IssuerAddress_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."IssuerAddress"
    ADD CONSTRAINT "IssuerAddress_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Regime Regime_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Regime"
    ADD CONSTRAINT "Regime_pkey" PRIMARY KEY (id);


--
-- Name: RequirementInstance RequirementInstance_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementInstance"
    ADD CONSTRAINT "RequirementInstance_pkey" PRIMARY KEY (id);


--
-- Name: RequirementTemplate RequirementTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementTemplate"
    ADD CONSTRAINT "RequirementTemplate_pkey" PRIMARY KEY (id);


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
-- Name: Asset_productId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Asset_productId_idx" ON public."Asset" USING btree ("productId");


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
-- Name: Authorization_issuanceId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Authorization_issuanceId_idx" ON public."Authorization" USING btree ("issuanceId");


--
-- Name: Authorization_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Authorization_status_idx" ON public."Authorization" USING btree (status);


--
-- Name: Event_assetId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Event_assetId_idx" ON public."Event" USING btree ("assetId");


--
-- Name: Event_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Event_createdAt_idx" ON public."Event" USING btree ("createdAt");


--
-- Name: Event_eventType_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Event_eventType_idx" ON public."Event" USING btree ("eventType");


--
-- Name: Event_organizationId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Event_organizationId_idx" ON public."Event" USING btree ("organizationId");


--
-- Name: Event_productId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Event_productId_idx" ON public."Event" USING btree ("productId");


--
-- Name: Event_userId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Event_userId_idx" ON public."Event" USING btree ("userId");


--
-- Name: Evidence_fileHash_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Evidence_fileHash_idx" ON public."Evidence" USING btree ("fileHash");


--
-- Name: Evidence_requirementInstanceId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Evidence_requirementInstanceId_idx" ON public."Evidence" USING btree ("requirementInstanceId");


--
-- Name: Evidence_uploadedAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Evidence_uploadedAt_idx" ON public."Evidence" USING btree ("uploadedAt");


--
-- Name: Evidence_uploadedBy_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Evidence_uploadedBy_idx" ON public."Evidence" USING btree ("uploadedBy");


--
-- Name: Issuance_manifestHash_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Issuance_manifestHash_idx" ON public."Issuance" USING btree ("manifestHash");


--
-- Name: IssuerAddress_address_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "IssuerAddress_address_idx" ON public."IssuerAddress" USING btree (address);


--
-- Name: IssuerAddress_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "IssuerAddress_createdAt_idx" ON public."IssuerAddress" USING btree ("createdAt");


--
-- Name: IssuerAddress_ledger_network_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "IssuerAddress_ledger_network_idx" ON public."IssuerAddress" USING btree (ledger, network);


--
-- Name: IssuerAddress_organizationId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "IssuerAddress_organizationId_idx" ON public."IssuerAddress" USING btree ("organizationId");


--
-- Name: IssuerAddress_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "IssuerAddress_status_idx" ON public."IssuerAddress" USING btree (status);


--
-- Name: Organization_country_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Organization_country_idx" ON public."Organization" USING btree (country);


--
-- Name: Organization_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Organization_createdAt_idx" ON public."Organization" USING btree ("createdAt");


--
-- Name: Organization_name_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "Organization_name_key" ON public."Organization" USING btree (name);


--
-- Name: Organization_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Organization_status_idx" ON public."Organization" USING btree (status);


--
-- Name: Product_assetClass_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Product_assetClass_idx" ON public."Product" USING btree ("assetClass");


--
-- Name: Product_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Product_createdAt_idx" ON public."Product" USING btree ("createdAt");


--
-- Name: Product_organizationId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Product_organizationId_idx" ON public."Product" USING btree ("organizationId");


--
-- Name: Product_organizationId_name_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "Product_organizationId_name_key" ON public."Product" USING btree ("organizationId", name);


--
-- Name: Product_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Product_status_idx" ON public."Product" USING btree (status);


--
-- Name: Regime_effectiveFrom_effectiveTo_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Regime_effectiveFrom_effectiveTo_idx" ON public."Regime" USING btree ("effectiveFrom", "effectiveTo");


--
-- Name: Regime_name_version_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "Regime_name_version_idx" ON public."Regime" USING btree (name, version);


--
-- Name: RequirementInstance_assetId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_assetId_idx" ON public."RequirementInstance" USING btree ("assetId");


--
-- Name: RequirementInstance_createdAt_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_createdAt_idx" ON public."RequirementInstance" USING btree ("createdAt");


--
-- Name: RequirementInstance_holder_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_holder_idx" ON public."RequirementInstance" USING btree (holder);


--
-- Name: RequirementInstance_issuanceId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_issuanceId_idx" ON public."RequirementInstance" USING btree ("issuanceId");


--
-- Name: RequirementInstance_platformAcknowledgedBy_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_platformAcknowledgedBy_idx" ON public."RequirementInstance" USING btree ("platformAcknowledgedBy");


--
-- Name: RequirementInstance_platformAcknowledged_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_platformAcknowledged_idx" ON public."RequirementInstance" USING btree ("platformAcknowledged");


--
-- Name: RequirementInstance_requirementTemplateId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_requirementTemplateId_idx" ON public."RequirementInstance" USING btree ("requirementTemplateId");


--
-- Name: RequirementInstance_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementInstance_status_idx" ON public."RequirementInstance" USING btree (status);


--
-- Name: RequirementTemplate_effectiveFrom_effectiveTo_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementTemplate_effectiveFrom_effectiveTo_idx" ON public."RequirementTemplate" USING btree ("effectiveFrom", "effectiveTo");


--
-- Name: RequirementTemplate_name_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementTemplate_name_idx" ON public."RequirementTemplate" USING btree (name);


--
-- Name: RequirementTemplate_regimeId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "RequirementTemplate_regimeId_idx" ON public."RequirementTemplate" USING btree ("regimeId");


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
-- Name: User_organizationId_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "User_organizationId_idx" ON public."User" USING btree ("organizationId");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: User_status_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "User_status_idx" ON public."User" USING btree (status);


--
-- Name: User_sub_idx; Type: INDEX; Schema: public; Owner: anitha
--

CREATE INDEX "User_sub_idx" ON public."User" USING btree (sub);


--
-- Name: User_sub_key; Type: INDEX; Schema: public; Owner: anitha
--

CREATE UNIQUE INDEX "User_sub_key" ON public."User" USING btree (sub);


--
-- Name: Asset Asset_issuingAddressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_issuingAddressId_fkey" FOREIGN KEY ("issuingAddressId") REFERENCES public."IssuerAddress"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Asset Asset_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Authorization Authorization_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Authorization"
    ADD CONSTRAINT "Authorization_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Authorization Authorization_issuanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Authorization"
    ADD CONSTRAINT "Authorization_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES public."Issuance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_issuerAddressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_issuerAddressId_fkey" FOREIGN KEY ("issuerAddressId") REFERENCES public."IssuerAddress"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_regimeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES public."Regime"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_requirementInstanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_requirementInstanceId_fkey" FOREIGN KEY ("requirementInstanceId") REFERENCES public."RequirementInstance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_requirementTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_requirementTemplateId_fkey" FOREIGN KEY ("requirementTemplateId") REFERENCES public."RequirementTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Evidence Evidence_requirementInstanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_requirementInstanceId_fkey" FOREIGN KEY ("requirementInstanceId") REFERENCES public."RequirementInstance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Evidence Evidence_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Issuance Issuance_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Issuance"
    ADD CONSTRAINT "Issuance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: IssuerAddress IssuerAddress_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."IssuerAddress"
    ADD CONSTRAINT "IssuerAddress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequirementInstance RequirementInstance_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementInstance"
    ADD CONSTRAINT "RequirementInstance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequirementInstance RequirementInstance_issuanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementInstance"
    ADD CONSTRAINT "RequirementInstance_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES public."Issuance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequirementInstance RequirementInstance_platformAcknowledgedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementInstance"
    ADD CONSTRAINT "RequirementInstance_platformAcknowledgedBy_fkey" FOREIGN KEY ("platformAcknowledgedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RequirementInstance RequirementInstance_requirementTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementInstance"
    ADD CONSTRAINT "RequirementInstance_requirementTemplateId_fkey" FOREIGN KEY ("requirementTemplateId") REFERENCES public."RequirementTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RequirementInstance RequirementInstance_verifierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementInstance"
    ADD CONSTRAINT "RequirementInstance_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RequirementTemplate RequirementTemplate_regimeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."RequirementTemplate"
    ADD CONSTRAINT "RequirementTemplate_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES public."Regime"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSettings UserSettings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: anitha
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: anitha
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict CquLZYb5YBiTxM54uFoJCK3tFS7TPoKeBdkP3etxO9WbiH7NeZHbpdC4G3I9oe2

