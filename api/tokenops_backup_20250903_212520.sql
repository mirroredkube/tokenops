--
-- PostgreSQL database dump
--

\restrict 1sh8VeE8c92qbIJmK8ACZUfdibM3ZxN51xuUxDUxGOMIycVcARFxOwzA0OKrNcr

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
    'NA',
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "Organization_country_valid" CHECK ((country ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT "Organization_name_not_empty" CHECK ((length(TRIM(BOTH FROM name)) > 0))
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
    status public."RequirementStatus" DEFAULT 'NA'::public."RequirementStatus" NOT NULL,
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
    notes text
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
cmezwe5mx0005z09mcyai934y	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP	XRPL	TESTNET	TESTCOMP	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:21:27.177	2025-08-31 16:21:27.177	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwebgd000jz09m542j8xtj	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP2	XRPL	TESTNET	TESTCOMP2	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:21:34.717	2025-08-31 16:21:34.717	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwentw000xz09mbmxocb7a	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP3	XRPL	TESTNET	TESTCOMP3	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:21:50.756	2025-08-31 16:21:50.756	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwf643001bz09m5u7fakr0	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP4	XRPL	TESTNET	TESTCOMP4	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:22:14.451	2025-08-31 16:22:14.451	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwfcfy001pz09mp9y3xw20	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP5	XRPL	TESTNET	TESTCOMP5	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:22:22.655	2025-08-31 16:22:22.655	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwk38i0001ml466a9ixj5r	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP9	XRPL	TESTNET	TESTCOMP9	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:26:04.003	2025-08-31 16:26:04.003	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwken6000fml464437krx6	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP10	XRPL	TESTNET	TESTCOMP10	6	RECORD_ONLY	\N	\N	\N	DRAFT	2025-08-31 16:26:18.786	2025-08-31 16:26:18.786	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezx6cla0003ako19fvle8lq	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.CHIMP	XRPL	TESTNET	CHIMP	6	RECORD_ONLY	\N	\N	\N	ACTIVE	2025-08-31 16:43:22.559	2025-08-31 16:43:28.435	cmezwdysd0001z09meu49f71j	cmezx6cl90001ako1wy265hml	OTHER
cmezxzuh70001cka5ov634mz8	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.JAMMER	XRPL	TESTNET	JAMMER	6	RECORD_ONLY	\N	\N	\N	ACTIVE	2025-08-31 17:06:18.763	2025-08-31 17:06:26.578	cmezwdysd0001z09meu49f71j	cmezx6cl90001ako1wy265hml	OTHER
cmezwgfmb000fh25e8f2vupmh	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP7	XRPL	TESTNET	TESTCOMP7	6	RECORD_ONLY	\N	\N	\N	RETIRED	2025-08-31 16:23:13.428	2025-08-31 21:26:00.984	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmezwg7tl0001h25e42j21tf8	xrpl:testnet/iou:rTestIssuer123456789.TESTCOMP6	XRPL	TESTNET	TESTCOMP6	6	RECORD_ONLY	\N	\N	\N	PAUSED	2025-08-31 16:23:03.321	2025-08-31 21:26:14.246	cmezwdysd0001z09meu49f71j	cmezwe5mv0003z09mpau1u6z5	OTHER
cmf2qdbku00019leaj3ur2ecy	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.SOMECOIN	XRPL	TESTNET	SOMECOIN	6	GATED_BEFORE	\N	\N	\N	DRAFT	2025-09-02 15:56:09.053	2025-09-02 15:56:09.053	cmf1gg9y00001gpfh2elklt7z	cmezx6cl90001ako1wy265hml	OTHER
cmf2qhhrk00079leavdvi8o3i	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.TESTART2	XRPL	TESTNET	TESTART2	6	GATED_BEFORE	\N	\N	\N	DRAFT	2025-09-02 15:59:23.696	2025-09-02 15:59:23.696	cmf1gg9y00001gpfh2elklt7z	cmezx6cl90001ako1wy265hml	OTHER
cmf2rcibx0001dq8mcd9aoyxp	xrpl:testnet/iou:rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX.ABCD	XRPL	TESTNET	ABCD	6	GATED_BEFORE	\N	\N	\N	ACTIVE	2025-09-02 16:23:30.765	2025-09-02 16:54:46.332	cmf1gg9y00001gpfh2elklt7z	cmezx6cl90001ako1wy265hml	ART
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
-- Data for Name: Issuance; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."Issuance" (id, "assetId", amount, "complianceRef", anchor, "txId", explorer, "createdAt", "updatedAt", "complianceEvaluated", "complianceStatus", holder, "manifestHash", "manifestVersion", status) FROM stdin;
iss_1756673233616_lskfjg399	cmezxzuh70001cka5ov634mz8	100	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezxzuh70001cka5ov634mz8", "timestamp": "2025-08-31T20:47:13.652Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "100", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf05vy00000149hzrk9ypuzs", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf05vy00000349hzw0nvdspx", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf05vy01000549hzggbhpc6z", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf05vy01000749hznj0arggm", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf05vy01000949hzo3t9xixa", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf05vy01000b49hzjqbbduww", "requirement_template_id": "xrpl-trustline-auth"}]}	t	174ECCC9E6DB815A527A63B53DE9B5CA7EDA088F6538A814758D59A18D5D1843	https://testnet.xrpl.org/transactions/174ECCC9E6DB815A527A63B53DE9B5CA7EDA088F6538A814758D59A18D5D1843	2025-08-31 20:47:13.618	2025-08-31 20:47:22.918	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	9e1dc9f6957a97694d7c36c0b20821292dcadc100476e39bbacd0a633dc47839	1.0	VALIDATED
iss_1756660402496_7y4g1slv0	cmezxzuh70001cka5ov634mz8	10	{"sha256": "5d4874c942c63eebea2858c31e58c757702bd7529d052460ee0db1154d075dd4", "recordId": "compliance-1756660386828-me7h4d3oa"}	t	43FF828452917A06D30007A01011BE143032AE2373769DDC5745576B22E8F408	https://testnet.xrpl.org/transactions/43FF828452917A06D30007A01011BE143032AE2373769DDC5745576B22E8F408	2025-08-31 17:13:22.498	2025-08-31 17:13:26.023	t	PENDING	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	\N	1.0	VALIDATED
iss_1756673194303_pspu3pz6p	cmezxzuh70001cka5ov634mz8	100	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezxzuh70001cka5ov634mz8", "timestamp": "2025-08-31T20:46:34.323Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "100", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf05v3nr0001389iltkxiisb", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf05v3nr0003389ibhkh9cf9", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf05v3nr0005389i1q7bnpgf", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf05v3ns0007389i06yehd4m", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf05v3ns0009389irwj4fs7s", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf05v3ns000b389in4wzaj0s", "requirement_template_id": "xrpl-trustline-auth"}]}	f	A383682A07338BFACCD8A6B0563B5AAFA64B610CA3C1FCD3B54DC0DD5F7BAF40	https://testnet.xrpl.org/transactions/A383682A07338BFACCD8A6B0563B5AAFA64B610CA3C1FCD3B54DC0DD5F7BAF40	2025-08-31 20:46:34.304	2025-08-31 20:46:41.226	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	009a066360f75d04a28561b4afe106472bc46fa2f045df2d2ee1211e861a95be	1.0	VALIDATED
iss_1756673792263_yjifybnir	cmezxzuh70001cka5ov634mz8	10	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezxzuh70001cka5ov634mz8", "timestamp": "2025-08-31T20:56:32.285Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "10", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf067x1t0001d4rr70ztnd3g", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf067x1t0003d4rrirvmva3s", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf067x1t0005d4rrrkgpo483", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf067x1t0007d4rrs2k3yp0c", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf067x1u0009d4rrt9kxk8oz", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf067x1u000bd4rrqah5c248", "requirement_template_id": "xrpl-trustline-auth"}]}	t	5BD7B9E40422F0799E18197549A69CA6BB8AD2349BB9AEA8ED59712F56C579C3	https://testnet.xrpl.org/transactions/5BD7B9E40422F0799E18197549A69CA6BB8AD2349BB9AEA8ED59712F56C579C3	2025-08-31 20:56:32.264	2025-08-31 20:56:36.805	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	09c883ab377be832c46ede383cc7a057d3039be77a148703e6372062601a7f44	1.0	VALIDATED
iss_1756674885253_hgpq6dhsa	cmezx6cla0003ako19fvle8lq	10	\N	t	\N	\N	2025-08-31 21:14:45.254	2025-08-31 21:14:45.254	f	PENDING	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	\N	1.0	SUBMITTED
iss_1756675029065_zyy2utm4o	cmezx6cla0003ako19fvle8lq	10	\N	t	\N	\N	2025-08-31 21:17:09.066	2025-08-31 21:17:09.066	f	PENDING	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	\N	1.0	SUBMITTED
iss_1756675116792_z6gh6hj39	cmezx6cla0003ako19fvle8lq	10	\N	t	\N	\N	2025-08-31 21:18:36.793	2025-08-31 21:18:36.793	f	PENDING	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	\N	1.0	SUBMITTED
iss_1756675147292_62jgyuxzn	cmezx6cla0003ako19fvle8lq	10	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezx6cla0003ako19fvle8lq", "timestamp": "2025-08-31T21:19:07.312Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "10", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf070ylg0001l5kl36q0w8nk", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf070ylg0003l5kl4r5psti6", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf070ylh0005l5kl7pvzkm92", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf070ylh0007l5kljmqlu6v3", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf070ylh0009l5kl2rvhbf3p", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf070ylh000bl5klpbved5ig", "requirement_template_id": "xrpl-trustline-auth"}]}	t	CFD47DFF210E3A5144F1F6927A016679A78372FCD1CB260E5001876985B57546	https://testnet.xrpl.org/transactions/CFD47DFF210E3A5144F1F6927A016679A78372FCD1CB260E5001876985B57546	2025-08-31 21:19:07.293	2025-08-31 21:19:22.257	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	5be78d08acaa3d2f602d17087da3bf6ef2a4ef504f58f52be5d176fd48b14d2a	1.0	VALIDATED
iss_1756675329525_cc4h7fu1a	cmezxzuh70001cka5ov634mz8	15	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezxzuh70001cka5ov634mz8", "timestamp": "2025-08-31T21:22:09.546Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "15", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf074v7k0001rmvmi7iokzmc", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf074v7k0003rmvm5jvrk4v1", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf074v7k0005rmvmhwl2ukmc", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf074v7k0007rmvmfbyw7csr", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf074v7k0009rmvm4fazf3xr", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf074v7l000brmvm68so29km", "requirement_template_id": "xrpl-trustline-auth"}]}	t	B582503869534CB55FBDAD82C11BAC4547473A1AF979E7960211D4271EA3F593	https://testnet.xrpl.org/transactions/B582503869534CB55FBDAD82C11BAC4547473A1AF979E7960211D4271EA3F593	2025-08-31 21:22:09.526	2025-08-31 21:22:23.097	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	e8d53c24a6ae860dcb39b36b056ea91fc07393d422854f648a9f5646fd561a93	1.0	VALIDATED
iss_1756675743283_qzohbczjv	cmezx6cla0003ako19fvle8lq	13	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezx6cla0003ako19fvle8lq", "timestamp": "2025-08-31T21:29:03.303Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "13", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf07dqgr00012rflezscca5b", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf07dqgr00032rflag3ivznt", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf07dqgs00052rflrtgisa39", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf07dqgs00072rflvuy6gdpk", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf07dqgs00092rflfsz1w5yb", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf07dqgs000b2rfluw6xkxa8", "requirement_template_id": "xrpl-trustline-auth"}]}	t	E99A57C5BDB761ECA4E57426395D29A15744D8DFF814B14E7774B36397D7294C	https://testnet.xrpl.org/transactions/E99A57C5BDB761ECA4E57426395D29A15744D8DFF814B14E7774B36397D7294C	2025-08-31 21:29:03.284	2025-08-31 21:29:15.226	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	578207ed3f97bbc9d5bbb6063318c57ebbe1dedd86a516a92372ec7eaa91c75f	1.0	VALIDATED
iss_1756675916570_arx5egibd	cmezxzuh70001cka5ov634mz8	14	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezxzuh70001cka5ov634mz8", "timestamp": "2025-08-31T21:31:56.608Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"amount": "14", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf07hg6h000112bxql6s4p48", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf07hg6h000312bxgrj73mbz", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf07hg6i000512bx96a8bcfz", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf07hg6i000712bx5x53s5o7", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf07hg6i000912bxtmau7yrs", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf07hg6i000b12bxaaug6xs7", "requirement_template_id": "xrpl-trustline-auth"}]}	t	FF79E9C8B68A85A01EB10657B0CC0E4AF2FBE9ED5C942E697BC966AF2DE3F779	https://testnet.xrpl.org/transactions/FF79E9C8B68A85A01EB10657B0CC0E4AF2FBE9ED5C942E697BC966AF2DE3F779	2025-08-31 21:31:56.572	2025-08-31 21:32:06.519	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	3d54c6b04242260ce8d1968b9519c5d3e032800c1b22f569c816ee360af7b29c	1.0	VALIDATED
iss_1756676124213_uc80ku52e	cmezx6cla0003ako19fvle8lq	15	{"org_id": "cmezwdpgz0000r00xlgcyby82", "asset_id": "cmezx6cla0003ako19fvle8lq", "timestamp": "2025-08-31T21:35:24.237Z", "product_id": "cmezwdysd0001z09meu49f71j", "issuance_facts": {"isin": "23413", "amount": "15", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw", "purpose": "Util", "mica_class": "utility_token", "jurisdiction": "AUS", "legal_issuer": "AWS", "kyc_requirement": "optional", "transfer_restrictions": "false"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "RECORD_ONLY"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "REQUIRED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "requirement_instance_id": "cmf07lwe70001cf9eylef81hc", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "requirement_instance_id": "cmf07lwe70003cf9ev6wwzmr4", "requirement_template_id": "mica-whitepaper-art"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token requires KYC verification", "requirement_instance_id": "cmf07lwe70005cf9emx78l3cr", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "REQUIRED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "requirement_instance_id": "cmf07lwe70007cf9ewgdnr7h4", "requirement_template_id": "mica-marketing-communications"}, {"status": "REQUIRED", "rationale": "CASP-to-CASP transfers require travel rule information", "requirement_instance_id": "cmf07lwe80009cf9ek4ev9bn7", "requirement_template_id": "travel-rule-payload"}, {"status": "REQUIRED", "rationale": "XRPL requires trustline authorization", "requirement_instance_id": "cmf07lwe8000bcf9er6b13n0r", "requirement_template_id": "xrpl-trustline-auth"}]}	t	322BC3FF0D60DA2CE629A62BC3E150DDDE1C11CA993F03BE704D81E5DA0A750B	https://testnet.xrpl.org/transactions/322BC3FF0D60DA2CE629A62BC3E150DDDE1C11CA993F03BE704D81E5DA0A750B	2025-08-31 21:35:24.214	2025-08-31 21:35:38.397	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	64c1f4ce80842b89a5c9bf544f8c822899c191bbcf4c1321dd01ebe03ddcfe0c	1.0	VALIDATED
iss_1756832184820_zbq4tn71s	cmf2rcibx0001dq8mcd9aoyxp	100	{"org_id": "cmf1gbx2v00001u4z8kg5ktml", "asset_id": "cmf2rcibx0001dq8mcd9aoyxp", "timestamp": "2025-09-02T16:56:24.851Z", "product_id": "cmf1gg9y00001gpfh2elklt7z", "issuance_facts": {"isin": "DE001232", "amount": "100", "holder": "rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw", "purpose": "Payment", "mica_class": "asset_backed", "jurisdiction": "DE", "legal_issuer": "Acme AG", "kyc_requirement": "mandatory", "transfer_restrictions": "false"}, "regime_versions": [{"name": "EU", "version": " MiCA"}, {"name": "EU", "version": " Travel Rule"}], "enforcement_plan": {"ledger": "XRPL", "network": "TESTNET", "gating_enabled": true, "compliance_mode": "GATED_BEFORE"}, "manifest_version": "1.0", "requirements_snapshot": [{"status": "SATISFIED", "rationale": "Asset-Referenced Token requires issuer authorization under MiCA", "evidence_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", "requirement_instance_id": "cmf2sitj60001qg0ppxja0utz", "requirement_template_id": "mica-issuer-auth-art-emt"}, {"status": "SATISFIED", "rationale": "Asset-Referenced Token requires white paper under MiCA Article 6", "evidence_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", "requirement_instance_id": "cmf2sitj60003qg0psih9wguq", "requirement_template_id": "mica-whitepaper-art"}, {"status": "SATISFIED", "rationale": "Asset-Referenced Token requires KYC verification", "evidence_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", "requirement_instance_id": "cmf2sitj60005qg0p8lq8bo60", "requirement_template_id": "mica-kyc-tier-art-emt"}, {"status": "SATISFIED", "rationale": "Asset-Referenced Token marketing requires compliance with MiCA", "evidence_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", "requirement_instance_id": "cmf2sitj60007qg0prgg3t4h2", "requirement_template_id": "mica-marketing-communications"}, {"status": "EXCEPTION", "rationale": "CASP-to-CASP transfers require travel rule information", "evidence_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", "requirement_instance_id": "cmf2sitj70009qg0psf4czzsj", "requirement_template_id": "travel-rule-payload"}, {"status": "EXCEPTION", "rationale": "XRPL requires trustline authorization", "evidence_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", "requirement_instance_id": "cmf2sitj7000bqg0pv73pkpoz", "requirement_template_id": "xrpl-trustline-auth"}]}	t	313D705238F318866312EA14979E05C3CFC600E290C42CA5CEE77F5577289807	https://testnet.xrpl.org/transactions/313D705238F318866312EA14979E05C3CFC600E290C42CA5CEE77F5577289807	2025-09-02 16:56:24.821	2025-09-02 16:56:38.569	t	READY	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	e3d724e35f52c9c02f9ab734a521007f0f44db9d783430dcebe327d160bc8e02	1.0	VALIDATED
\.


--
-- Data for Name: IssuerAddress; Type: TABLE DATA; Schema: public; Owner: anitha
--

COPY public."IssuerAddress" (id, "organizationId", address, ledger, network, "allowedUseTags", status, "proofOfControl", "approvedAt", "approvedBy", "suspendedAt", "suspendedBy", reason, metadata, "createdAt", "updatedAt") FROM stdin;
cmezwe5mv0003z09mpau1u6z5	cmezwdpgz0000r00xlgcyby82	rTestIssuer123456789	XRPL	TESTNET	{OTHER}	APPROVED	\N	\N	\N	\N	\N	\N	\N	2025-08-31 16:21:27.176	2025-08-31 16:21:27.176
cmezx6cl90001ako1wy265hml	cmezwdpgz0000r00xlgcyby82	rL7uh1hrWXRknvhhCBgRbvdRytourhCaGX	XRPL	TESTNET	{OTHER}	APPROVED	\N	\N	\N	\N	\N	\N	\N	2025-08-31 16:43:22.557	2025-08-31 16:43:22.557
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

COPY public."RequirementInstance" (id, "assetId", "requirementTemplateId", status, "evidenceRefs", "verifierId", "verifiedAt", rationale, "exceptionReason", "createdAt", "updatedAt", holder, "issuanceId", "transferAmount", "transferType", notes) FROM stdin;
cmezwe5n80007z09mga8hxnwj	cmezwe5mx0005z09mcyai934y	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:21:27.188	2025-08-31 16:21:27.188	\N	\N	\N	\N	\N
cmezwe5na0009z09ma4xuvf0k	cmezwe5mx0005z09mcyai934y	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:21:27.191	2025-08-31 16:21:27.191	\N	\N	\N	\N	\N
cmezwe5nb000bz09mkctw0y6b	cmezwe5mx0005z09mcyai934y	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:21:27.192	2025-08-31 16:21:27.192	\N	\N	\N	\N	\N
cmezwe5nc000dz09myb5q1oya	cmezwe5mx0005z09mcyai934y	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:21:27.192	2025-08-31 16:21:27.192	\N	\N	\N	\N	\N
cmezwe5nd000fz09mdgo9a3zr	cmezwe5mx0005z09mcyai934y	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:21:27.193	2025-08-31 16:21:27.193	\N	\N	\N	\N	\N
cmezwe5nd000hz09mvr53lhx8	cmezwe5mx0005z09mcyai934y	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:21:27.194	2025-08-31 16:21:27.194	\N	\N	\N	\N	\N
cmezwebgg000lz09mnhsrqm5j	cmezwebgd000jz09m542j8xtj	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:21:34.721	2025-08-31 16:21:34.721	\N	\N	\N	\N	\N
cmezwebgh000nz09maxd9t7zl	cmezwebgd000jz09m542j8xtj	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:21:34.721	2025-08-31 16:21:34.721	\N	\N	\N	\N	\N
cmezwebgi000pz09mbp2aseok	cmezwebgd000jz09m542j8xtj	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:21:34.722	2025-08-31 16:21:34.722	\N	\N	\N	\N	\N
cmezwebgi000rz09m27mw9u0v	cmezwebgd000jz09m542j8xtj	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:21:34.722	2025-08-31 16:21:34.722	\N	\N	\N	\N	\N
cmezwebgj000tz09mdselymvk	cmezwebgd000jz09m542j8xtj	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:21:34.723	2025-08-31 16:21:34.723	\N	\N	\N	\N	\N
cmezwebgj000vz09mcj5ohmuk	cmezwebgd000jz09m542j8xtj	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:21:34.723	2025-08-31 16:21:34.723	\N	\N	\N	\N	\N
cmezwentz000zz09mvkaiio00	cmezwentw000xz09mbmxocb7a	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:21:50.76	2025-08-31 16:21:50.76	\N	\N	\N	\N	\N
cmezwenu00011z09mb6knaqyr	cmezwentw000xz09mbmxocb7a	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:21:50.76	2025-08-31 16:21:50.76	\N	\N	\N	\N	\N
cmezwenu00013z09myvcstjgn	cmezwentw000xz09mbmxocb7a	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:21:50.761	2025-08-31 16:21:50.761	\N	\N	\N	\N	\N
cmezwenu10015z09m3x6epq1k	cmezwentw000xz09mbmxocb7a	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:21:50.761	2025-08-31 16:21:50.761	\N	\N	\N	\N	\N
cmezwenu20017z09m25liz2ye	cmezwentw000xz09mbmxocb7a	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:21:50.762	2025-08-31 16:21:50.762	\N	\N	\N	\N	\N
cmezwenu20019z09m7s8s8b2k	cmezwentw000xz09mbmxocb7a	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:21:50.762	2025-08-31 16:21:50.762	\N	\N	\N	\N	\N
cmezwf648001dz09mnshzxy6o	cmezwf643001bz09m5u7fakr0	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:22:14.456	2025-08-31 16:22:14.456	\N	\N	\N	\N	\N
cmezwf648001fz09mf8aes4sc	cmezwf643001bz09m5u7fakr0	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:22:14.457	2025-08-31 16:22:14.457	\N	\N	\N	\N	\N
cmezwf649001hz09m90fh9tgs	cmezwf643001bz09m5u7fakr0	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:22:14.457	2025-08-31 16:22:14.457	\N	\N	\N	\N	\N
cmezwf649001jz09mqgqt2yqx	cmezwf643001bz09m5u7fakr0	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:22:14.458	2025-08-31 16:22:14.458	\N	\N	\N	\N	\N
cmezwf64a001lz09moy8jvlom	cmezwf643001bz09m5u7fakr0	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:22:14.458	2025-08-31 16:22:14.458	\N	\N	\N	\N	\N
cmezwf64a001nz09mz7drzi02	cmezwf643001bz09m5u7fakr0	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:22:14.458	2025-08-31 16:22:14.458	\N	\N	\N	\N	\N
cmezwfcg1001rz09m56xdeona	cmezwfcfy001pz09mp9y3xw20	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:22:22.658	2025-08-31 16:22:22.658	\N	\N	\N	\N	\N
cmezwfcg2001tz09mbn3l4cnb	cmezwfcfy001pz09mp9y3xw20	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:22:22.658	2025-08-31 16:22:22.658	\N	\N	\N	\N	\N
cmezwfcg2001vz09mkqqur7l4	cmezwfcfy001pz09mp9y3xw20	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:22:22.658	2025-08-31 16:22:22.658	\N	\N	\N	\N	\N
cmezwfcg3001xz09mdpjfbola	cmezwfcfy001pz09mp9y3xw20	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:22:22.659	2025-08-31 16:22:22.659	\N	\N	\N	\N	\N
cmezwfcg3001zz09mzvlw439h	cmezwfcfy001pz09mp9y3xw20	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:22:22.659	2025-08-31 16:22:22.659	\N	\N	\N	\N	\N
cmezwfcg40021z09mssoxt651	cmezwfcfy001pz09mp9y3xw20	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:22:22.66	2025-08-31 16:22:22.66	\N	\N	\N	\N	\N
cmezwg7u00003h25eljekvbgy	cmezwg7tl0001h25e42j21tf8	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:23:03.336	2025-08-31 16:23:03.336	\N	\N	\N	\N	\N
cmezwg7u20005h25e5sg4ypdv	cmezwg7tl0001h25e42j21tf8	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:23:03.339	2025-08-31 16:23:03.339	\N	\N	\N	\N	\N
cmezwg7u30007h25ehssaduqj	cmezwg7tl0001h25e42j21tf8	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:23:03.34	2025-08-31 16:23:03.34	\N	\N	\N	\N	\N
cmezwg7u40009h25erhkhvpo8	cmezwg7tl0001h25e42j21tf8	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:23:03.34	2025-08-31 16:23:03.34	\N	\N	\N	\N	\N
cmezwg7u5000bh25exj2y52rh	cmezwg7tl0001h25e42j21tf8	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:23:03.341	2025-08-31 16:23:03.341	\N	\N	\N	\N	\N
cmezwg7u5000dh25ee4j9w6zd	cmezwg7tl0001h25e42j21tf8	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:23:03.342	2025-08-31 16:23:03.342	\N	\N	\N	\N	\N
cmezwgfmf000hh25e4j93fxh2	cmezwgfmb000fh25e8f2vupmh	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:23:13.431	2025-08-31 16:23:13.431	\N	\N	\N	\N	\N
cmezwgfmf000jh25exl54dr7i	cmezwgfmb000fh25e8f2vupmh	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:23:13.432	2025-08-31 16:23:13.432	\N	\N	\N	\N	\N
cmezwgfmg000lh25epm6cgq2z	cmezwgfmb000fh25e8f2vupmh	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:23:13.432	2025-08-31 16:23:13.432	\N	\N	\N	\N	\N
cmezwgfmg000nh25etjdwqqpc	cmezwgfmb000fh25e8f2vupmh	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:23:13.432	2025-08-31 16:23:13.432	\N	\N	\N	\N	\N
cmezwgfmh000ph25e64rxxdi6	cmezwgfmb000fh25e8f2vupmh	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:23:13.433	2025-08-31 16:23:13.433	\N	\N	\N	\N	\N
cmezwgfmh000rh25exp04jttt	cmezwgfmb000fh25e8f2vupmh	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:23:13.433	2025-08-31 16:23:13.433	\N	\N	\N	\N	\N
cmezwk38v0003ml468osp109z	cmezwk38i0001ml466a9ixj5r	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:26:04.015	2025-08-31 16:26:04.015	\N	\N	\N	\N	\N
cmezwk38x0005ml46vsumtij7	cmezwk38i0001ml466a9ixj5r	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:26:04.018	2025-08-31 16:26:04.018	\N	\N	\N	\N	\N
cmezwk38y0007ml46bxfj8d63	cmezwk38i0001ml466a9ixj5r	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:26:04.018	2025-08-31 16:26:04.018	\N	\N	\N	\N	\N
cmezwk38y0009ml46wumz6gat	cmezwk38i0001ml466a9ixj5r	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:26:04.019	2025-08-31 16:26:04.019	\N	\N	\N	\N	\N
cmezwk38z000bml46eydvqgua	cmezwk38i0001ml466a9ixj5r	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:26:04.019	2025-08-31 16:26:04.019	\N	\N	\N	\N	\N
cmezwk38z000dml46m4nr4tfg	cmezwk38i0001ml466a9ixj5r	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:26:04.02	2025-08-31 16:26:04.02	\N	\N	\N	\N	\N
cmezwkena000hml466rjpcug7	cmezwken6000fml464437krx6	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:26:18.79	2025-08-31 16:26:18.79	\N	\N	\N	\N	\N
cmezwkena000jml46xq5g1utk	cmezwken6000fml464437krx6	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:26:18.791	2025-08-31 16:26:18.791	\N	\N	\N	\N	\N
cmezwkenb000lml46z6pttwtz	cmezwken6000fml464437krx6	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:26:18.791	2025-08-31 16:26:18.791	\N	\N	\N	\N	\N
cmezwkenb000nml46u23pycx2	cmezwken6000fml464437krx6	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:26:18.792	2025-08-31 16:26:18.792	\N	\N	\N	\N	\N
cmezwkenc000pml46pf2mmcuh	cmezwken6000fml464437krx6	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:26:18.792	2025-08-31 16:26:18.792	\N	\N	\N	\N	\N
cmezwkenc000rml46jcb3fqwn	cmezwken6000fml464437krx6	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:26:18.792	2025-08-31 16:26:18.792	\N	\N	\N	\N	\N
cmezwkw29000tml46mc3q28es	cmezwgfmb000fh25e8f2vupmh	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:26:41.362	2025-08-31 16:26:41.362	\N	\N	\N	\N	\N
cmezwkw2a000vml46my611nh7	cmezwgfmb000fh25e8f2vupmh	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:26:41.363	2025-08-31 16:26:41.363	\N	\N	\N	\N	\N
cmezwkw2b000xml46q8l30vso	cmezwgfmb000fh25e8f2vupmh	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:26:41.363	2025-08-31 16:26:41.363	\N	\N	\N	\N	\N
cmezwkw2b000zml46r6oy2atb	cmezwgfmb000fh25e8f2vupmh	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:26:41.363	2025-08-31 16:26:41.363	\N	\N	\N	\N	\N
cmezwkw2b0011ml4674psnzr3	cmezwgfmb000fh25e8f2vupmh	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:26:41.364	2025-08-31 16:26:41.364	\N	\N	\N	\N	\N
cmezwkw2c0013ml469axjat0l	cmezwgfmb000fh25e8f2vupmh	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:26:41.364	2025-08-31 16:26:41.364	\N	\N	\N	\N	\N
cmezx6clr0005ako1u9dtr5x6	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 16:43:22.576	2025-08-31 16:43:22.576	\N	\N	\N	\N	\N
cmezx6clw0007ako1f2vz76nx	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 16:43:22.58	2025-08-31 16:43:22.58	\N	\N	\N	\N	\N
cmezx6clx0009ako1q6sk1qhz	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 16:43:22.581	2025-08-31 16:43:22.581	\N	\N	\N	\N	\N
cmezx6clx000bako1prqibipo	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 16:43:22.582	2025-08-31 16:43:22.582	\N	\N	\N	\N	\N
cmezx6cly000dako1zpamfwhj	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 16:43:22.582	2025-08-31 16:43:22.582	\N	\N	\N	\N	\N
cmezx6clz000fako1n82ukpnj	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 16:43:22.583	2025-08-31 16:43:22.583	\N	\N	\N	\N	\N
cmezxzuhs0003cka5k2vbieqj	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 17:06:18.785	2025-08-31 17:06:18.785	\N	\N	\N	\N	\N
cmezxzuhv0005cka5o4u4db9z	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 17:06:18.788	2025-08-31 17:06:18.788	\N	\N	\N	\N	\N
cmezxzuhw0007cka5h9dp7bxr	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 17:06:18.789	2025-08-31 17:06:18.789	\N	\N	\N	\N	\N
cmezxzuhx0009cka5etrcoo4a	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 17:06:18.789	2025-08-31 17:06:18.789	\N	\N	\N	\N	\N
cmezxzuhx000bcka5uav94kr0	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 17:06:18.79	2025-08-31 17:06:18.79	\N	\N	\N	\N	\N
cmezxzuhy000dcka5tt34czqy	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 17:06:18.791	2025-08-31 17:06:18.791	\N	\N	\N	\N	\N
cmezy8xft0001wcei5j8p4hgr	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 17:13:22.505	2025-08-31 17:13:22.505	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	iss_1756660402496_7y4g1slv0	10	CASP_TO_CASP	\N
cmezy8xg00003wceiweh1kw40	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 17:13:22.512	2025-08-31 17:13:22.512	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	iss_1756660402496_7y4g1slv0	10	CASP_TO_CASP	\N
cmezy8xg20005wceiyqm8xh7g	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 17:13:22.515	2025-08-31 17:13:22.515	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	iss_1756660402496_7y4g1slv0	10	CASP_TO_CASP	\N
cmezy8xg50007wceiupw45t0l	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 17:13:22.518	2025-08-31 17:13:22.518	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	iss_1756660402496_7y4g1slv0	10	CASP_TO_CASP	\N
cmezy8xg70009wceimxiivx6m	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 17:13:22.52	2025-08-31 17:13:22.52	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	iss_1756660402496_7y4g1slv0	10	CASP_TO_CASP	\N
cmezy8xga000bwceiniugqifw	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 17:13:22.522	2025-08-31 17:13:22.522	rE5MDtonMcosLV6fpRJjib3MQiBZ8HGapw	iss_1756660402496_7y4g1slv0	10	CASP_TO_CASP	\N
cmf05v3nr0001389iltkxiisb	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 20:46:34.31	2025-08-31 20:46:34.31	\N	iss_1756673194303_pspu3pz6p	\N	\N	\N
cmf05v3nr0003389ibhkh9cf9	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 20:46:34.31	2025-08-31 20:46:34.31	\N	iss_1756673194303_pspu3pz6p	\N	\N	\N
cmf05v3nr0005389i1q7bnpgf	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 20:46:34.31	2025-08-31 20:46:34.31	\N	iss_1756673194303_pspu3pz6p	\N	\N	\N
cmf05v3ns0007389i06yehd4m	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 20:46:34.31	2025-08-31 20:46:34.31	\N	iss_1756673194303_pspu3pz6p	\N	\N	\N
cmf05v3ns0009389irwj4fs7s	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 20:46:34.31	2025-08-31 20:46:34.31	\N	iss_1756673194303_pspu3pz6p	\N	\N	\N
cmf05v3ns000b389in4wzaj0s	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 20:46:34.31	2025-08-31 20:46:34.31	\N	iss_1756673194303_pspu3pz6p	\N	\N	\N
cmf05vy00000149hzrk9ypuzs	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 20:47:13.628	2025-08-31 20:47:13.628	\N	iss_1756673233616_lskfjg399	\N	\N	\N
cmf05vy00000349hzw0nvdspx	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 20:47:13.628	2025-08-31 20:47:13.628	\N	iss_1756673233616_lskfjg399	\N	\N	\N
cmf05vy01000549hzggbhpc6z	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 20:47:13.628	2025-08-31 20:47:13.628	\N	iss_1756673233616_lskfjg399	\N	\N	\N
cmf05vy01000749hznj0arggm	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 20:47:13.628	2025-08-31 20:47:13.628	\N	iss_1756673233616_lskfjg399	\N	\N	\N
cmf05vy01000949hzo3t9xixa	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 20:47:13.628	2025-08-31 20:47:13.628	\N	iss_1756673233616_lskfjg399	\N	\N	\N
cmf05vy01000b49hzjqbbduww	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 20:47:13.629	2025-08-31 20:47:13.629	\N	iss_1756673233616_lskfjg399	\N	\N	\N
cmf067x1t0001d4rr70ztnd3g	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 20:56:32.271	2025-08-31 20:56:32.271	\N	iss_1756673792263_yjifybnir	\N	\N	\N
cmf067x1t0003d4rrirvmva3s	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 20:56:32.271	2025-08-31 20:56:32.271	\N	iss_1756673792263_yjifybnir	\N	\N	\N
cmf067x1t0005d4rrrkgpo483	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 20:56:32.271	2025-08-31 20:56:32.271	\N	iss_1756673792263_yjifybnir	\N	\N	\N
cmf067x1t0007d4rrs2k3yp0c	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 20:56:32.271	2025-08-31 20:56:32.271	\N	iss_1756673792263_yjifybnir	\N	\N	\N
cmf067x1u0009d4rrt9kxk8oz	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 20:56:32.271	2025-08-31 20:56:32.271	\N	iss_1756673792263_yjifybnir	\N	\N	\N
cmf067x1u000bd4rrqah5c248	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 20:56:32.271	2025-08-31 20:56:32.271	\N	iss_1756673792263_yjifybnir	\N	\N	\N
cmf06vcen0001ydv7aaad6dvu	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:14:45.261	2025-08-31 21:14:45.261	\N	iss_1756674885253_hgpq6dhsa	\N	\N	\N
cmf06vcen0003ydv7snia6m8w	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:14:45.261	2025-08-31 21:14:45.261	\N	iss_1756674885253_hgpq6dhsa	\N	\N	\N
cmf06vcen0005ydv71guglwii	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:14:45.261	2025-08-31 21:14:45.261	\N	iss_1756674885253_hgpq6dhsa	\N	\N	\N
cmf06vceo0007ydv794ypcslz	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:14:45.261	2025-08-31 21:14:45.261	\N	iss_1756674885253_hgpq6dhsa	\N	\N	\N
cmf06vceo0009ydv77j3pzl9d	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:14:45.261	2025-08-31 21:14:45.261	\N	iss_1756674885253_hgpq6dhsa	\N	\N	\N
cmf06vceo000bydv7krsqc0rf	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:14:45.261	2025-08-31 21:14:45.261	\N	iss_1756674885253_hgpq6dhsa	\N	\N	\N
cmf06yfdf0001wsx3lyuevn1g	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:17:09.073	2025-08-31 21:17:09.073	\N	iss_1756675029065_zyy2utm4o	\N	\N	\N
cmf06yfdf0003wsx38b5s303k	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:17:09.073	2025-08-31 21:17:09.073	\N	iss_1756675029065_zyy2utm4o	\N	\N	\N
cmf06yfdg0005wsx3ybrkh64k	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:17:09.073	2025-08-31 21:17:09.073	\N	iss_1756675029065_zyy2utm4o	\N	\N	\N
cmf06yfdg0007wsx32qmuthpb	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:17:09.073	2025-08-31 21:17:09.073	\N	iss_1756675029065_zyy2utm4o	\N	\N	\N
cmf06yfdg0009wsx3jtas3b5v	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:17:09.073	2025-08-31 21:17:09.073	\N	iss_1756675029065_zyy2utm4o	\N	\N	\N
cmf06yfdg000bwsx3nj7mjane	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:17:09.073	2025-08-31 21:17:09.073	\N	iss_1756675029065_zyy2utm4o	\N	\N	\N
cmf070b2800012ax2zzbmbgrj	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:18:36.798	2025-08-31 21:18:36.798	\N	iss_1756675116792_z6gh6hj39	\N	\N	\N
cmf070b2800032ax2wqkie5m0	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:18:36.798	2025-08-31 21:18:36.798	\N	iss_1756675116792_z6gh6hj39	\N	\N	\N
cmf070b2800052ax27e79yy4y	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:18:36.799	2025-08-31 21:18:36.799	\N	iss_1756675116792_z6gh6hj39	\N	\N	\N
cmf070b2800072ax2crzsf0lv	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:18:36.799	2025-08-31 21:18:36.799	\N	iss_1756675116792_z6gh6hj39	\N	\N	\N
cmf070b2800092ax2y5onflcz	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:18:36.799	2025-08-31 21:18:36.799	\N	iss_1756675116792_z6gh6hj39	\N	\N	\N
cmf070b28000b2ax2hic9b7rv	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:18:36.799	2025-08-31 21:18:36.799	\N	iss_1756675116792_z6gh6hj39	\N	\N	\N
cmf070ylg0001l5kl36q0w8nk	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:19:07.298	2025-08-31 21:19:07.298	\N	iss_1756675147292_62jgyuxzn	\N	\N	\N
cmf070ylg0003l5kl4r5psti6	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:19:07.298	2025-08-31 21:19:07.298	\N	iss_1756675147292_62jgyuxzn	\N	\N	\N
cmf070ylh0005l5kl7pvzkm92	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:19:07.298	2025-08-31 21:19:07.298	\N	iss_1756675147292_62jgyuxzn	\N	\N	\N
cmf070ylh0007l5kljmqlu6v3	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:19:07.298	2025-08-31 21:19:07.298	\N	iss_1756675147292_62jgyuxzn	\N	\N	\N
cmf070ylh0009l5kl2rvhbf3p	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:19:07.298	2025-08-31 21:19:07.298	\N	iss_1756675147292_62jgyuxzn	\N	\N	\N
cmf070ylh000bl5klpbved5ig	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:19:07.298	2025-08-31 21:19:07.298	\N	iss_1756675147292_62jgyuxzn	\N	\N	\N
cmf074v7k0001rmvmi7iokzmc	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:22:09.533	2025-08-31 21:22:09.533	\N	iss_1756675329525_cc4h7fu1a	\N	\N	\N
cmf074v7k0003rmvm5jvrk4v1	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:22:09.533	2025-08-31 21:22:09.533	\N	iss_1756675329525_cc4h7fu1a	\N	\N	\N
cmf074v7k0005rmvmhwl2ukmc	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:22:09.533	2025-08-31 21:22:09.533	\N	iss_1756675329525_cc4h7fu1a	\N	\N	\N
cmf074v7k0007rmvmfbyw7csr	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:22:09.533	2025-08-31 21:22:09.533	\N	iss_1756675329525_cc4h7fu1a	\N	\N	\N
cmf074v7k0009rmvm4fazf3xr	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:22:09.533	2025-08-31 21:22:09.533	\N	iss_1756675329525_cc4h7fu1a	\N	\N	\N
cmf074v7l000brmvm68so29km	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:22:09.533	2025-08-31 21:22:09.533	\N	iss_1756675329525_cc4h7fu1a	\N	\N	\N
cmf07dqgr00012rflezscca5b	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:29:03.29	2025-08-31 21:29:03.29	\N	iss_1756675743283_qzohbczjv	\N	\N	\N
cmf07dqgr00032rflag3ivznt	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:29:03.29	2025-08-31 21:29:03.29	\N	iss_1756675743283_qzohbczjv	\N	\N	\N
cmf07dqgs00052rflrtgisa39	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:29:03.29	2025-08-31 21:29:03.29	\N	iss_1756675743283_qzohbczjv	\N	\N	\N
cmf07dqgs00072rflvuy6gdpk	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:29:03.29	2025-08-31 21:29:03.29	\N	iss_1756675743283_qzohbczjv	\N	\N	\N
cmf07dqgs00092rflfsz1w5yb	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:29:03.29	2025-08-31 21:29:03.29	\N	iss_1756675743283_qzohbczjv	\N	\N	\N
cmf07dqgs000b2rfluw6xkxa8	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:29:03.29	2025-08-31 21:29:03.29	\N	iss_1756675743283_qzohbczjv	\N	\N	\N
cmf07hg6h000112bxql6s4p48	cmezxzuh70001cka5ov634mz8	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:31:56.581	2025-08-31 21:31:56.581	\N	iss_1756675916570_arx5egibd	\N	\N	\N
cmf07hg6h000312bxgrj73mbz	cmezxzuh70001cka5ov634mz8	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:31:56.581	2025-08-31 21:31:56.581	\N	iss_1756675916570_arx5egibd	\N	\N	\N
cmf07hg6i000512bx96a8bcfz	cmezxzuh70001cka5ov634mz8	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:31:56.581	2025-08-31 21:31:56.581	\N	iss_1756675916570_arx5egibd	\N	\N	\N
cmf07hg6i000712bx5x53s5o7	cmezxzuh70001cka5ov634mz8	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:31:56.581	2025-08-31 21:31:56.581	\N	iss_1756675916570_arx5egibd	\N	\N	\N
cmf07hg6i000912bxtmau7yrs	cmezxzuh70001cka5ov634mz8	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:31:56.581	2025-08-31 21:31:56.581	\N	iss_1756675916570_arx5egibd	\N	\N	\N
cmf07hg6i000b12bxaaug6xs7	cmezxzuh70001cka5ov634mz8	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:31:56.581	2025-08-31 21:31:56.581	\N	iss_1756675916570_arx5egibd	\N	\N	\N
cmf07lwe70001cf9eylef81hc	cmezx6cla0003ako19fvle8lq	mica-issuer-auth-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-08-31 21:35:24.221	2025-08-31 21:35:24.221	\N	iss_1756676124213_uc80ku52e	\N	\N	\N
cmf07lwe70003cf9ev6wwzmr4	cmezx6cla0003ako19fvle8lq	mica-whitepaper-art	REQUIRED	null	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-08-31 21:35:24.221	2025-08-31 21:35:24.221	\N	iss_1756676124213_uc80ku52e	\N	\N	\N
cmf07lwe70005cf9emx78l3cr	cmezx6cla0003ako19fvle8lq	mica-kyc-tier-art-emt	REQUIRED	null	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-08-31 21:35:24.221	2025-08-31 21:35:24.221	\N	iss_1756676124213_uc80ku52e	\N	\N	\N
cmf07lwe70007cf9ewgdnr7h4	cmezx6cla0003ako19fvle8lq	mica-marketing-communications	REQUIRED	null	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-08-31 21:35:24.221	2025-08-31 21:35:24.221	\N	iss_1756676124213_uc80ku52e	\N	\N	\N
cmf07lwe80009cf9ek4ev9bn7	cmezx6cla0003ako19fvle8lq	travel-rule-payload	REQUIRED	null	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-08-31 21:35:24.221	2025-08-31 21:35:24.221	\N	iss_1756676124213_uc80ku52e	\N	\N	\N
cmf07lwe8000bcf9er6b13n0r	cmezx6cla0003ako19fvle8lq	xrpl-trustline-auth	REQUIRED	null	\N	\N	XRPL requires trustline authorization	\N	2025-08-31 21:35:24.221	2025-08-31 21:35:24.221	\N	iss_1756676124213_uc80ku52e	\N	\N	\N
cmf1k2msl000112mrn8i51pnv	cmezwe5mx0005z09mcyai934y	mica-issuer-auth-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-09-01 20:12:06.501	2025-09-01 20:12:06.501	\N	\N	\N	\N	\N
cmf1k2msp000312mrjjwsqwrx	cmezwe5mx0005z09mcyai934y	mica-whitepaper-art	REQUIRED	\N	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-09-01 20:12:06.505	2025-09-01 20:12:06.505	\N	\N	\N	\N	\N
cmf1k2msq000512mrszq1u3vi	cmezwe5mx0005z09mcyai934y	mica-kyc-tier-art-emt	REQUIRED	\N	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-09-01 20:12:06.507	2025-09-01 20:12:06.507	\N	\N	\N	\N	\N
cmf1k2msr000712mrpvu5h55m	cmezwe5mx0005z09mcyai934y	mica-marketing-communications	REQUIRED	\N	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-09-01 20:12:06.507	2025-09-01 20:12:06.507	\N	\N	\N	\N	\N
cmf1k2mt1000912mrf8pd232r	cmezwe5mx0005z09mcyai934y	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-01 20:12:06.514	2025-09-01 20:12:06.514	\N	\N	\N	\N	\N
cmf1k2mtj000b12mr4q5jza20	cmezwe5mx0005z09mcyai934y	xrpl-trustline-auth	REQUIRED	\N	\N	\N	XRPL requires trustline authorization	\N	2025-09-01 20:12:06.535	2025-09-01 20:12:06.535	\N	\N	\N	\N	\N
cmf2qdblf00059lea1r0kwah9	cmf2qdbku00019leaj3ur2ecy	xrpl-trustline-auth	EXCEPTION	{}	\N	\N	XRPL requires trustline authorization	\N	2025-09-02 15:56:09.076	2025-09-02 18:03:22.293	\N	\N	\N	\N	\N
cmf2qhhru00099leakwhi4j63	cmf2qhhrk00079leavdvi8o3i	travel-rule-payload	REQUIRED	\N	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-02 15:59:23.706	2025-09-02 15:59:23.706	\N	\N	\N	\N	\N
cmf2rcicb0003dq8m0kmm76fa	cmf2rcibx0001dq8mcd9aoyxp	mica-issuer-auth-art-emt	SATISFIED	{}	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-09-02 16:23:30.78	2025-09-02 16:50:06.068	\N	\N	\N	\N	\N
cmf2rcice0005dq8mt2jbhkjy	cmf2rcibx0001dq8mcd9aoyxp	mica-whitepaper-art	SATISFIED	{}	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-09-02 16:23:30.783	2025-09-02 16:50:08.661	\N	\N	\N	\N	\N
cmf2rcicf0007dq8m4vnfpguk	cmf2rcibx0001dq8mcd9aoyxp	mica-kyc-tier-art-emt	SATISFIED	{}	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-09-02 16:23:30.784	2025-09-02 16:50:12.313	\N	\N	\N	\N	\N
cmf2rcicg0009dq8mx7ocawuv	cmf2rcibx0001dq8mcd9aoyxp	mica-marketing-communications	SATISFIED	{}	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-09-02 16:23:30.784	2025-09-02 16:50:15.233	\N	\N	\N	\N	\N
cmf2rcicg000bdq8m31boij1m	cmf2rcibx0001dq8mcd9aoyxp	travel-rule-payload	EXCEPTION	{}	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-02 16:23:30.785	2025-09-02 16:50:28.995	\N	\N	\N	\N	\N
cmf2rcich000ddq8mbesbddqb	cmf2rcibx0001dq8mcd9aoyxp	xrpl-trustline-auth	EXCEPTION	{}	\N	\N	XRPL requires trustline authorization	\N	2025-09-02 16:23:30.785	2025-09-02 16:50:32.916	\N	\N	\N	\N	\N
cmf2sitj60001qg0ppxja0utz	cmf2rcibx0001dq8mcd9aoyxp	mica-issuer-auth-art-emt	SATISFIED	{}	\N	\N	Asset-Referenced Token requires issuer authorization under MiCA	\N	2025-09-02 16:56:24.831	2025-09-02 16:56:24.831	\N	iss_1756832184820_zbq4tn71s	\N	\N	\N
cmf2sitj60003qg0psih9wguq	cmf2rcibx0001dq8mcd9aoyxp	mica-whitepaper-art	SATISFIED	{}	\N	\N	Asset-Referenced Token requires white paper under MiCA Article 6	\N	2025-09-02 16:56:24.831	2025-09-02 16:56:24.831	\N	iss_1756832184820_zbq4tn71s	\N	\N	\N
cmf2sitj60005qg0p8lq8bo60	cmf2rcibx0001dq8mcd9aoyxp	mica-kyc-tier-art-emt	SATISFIED	{}	\N	\N	Asset-Referenced Token requires KYC verification	\N	2025-09-02 16:56:24.831	2025-09-02 16:56:24.831	\N	iss_1756832184820_zbq4tn71s	\N	\N	\N
cmf2sitj60007qg0prgg3t4h2	cmf2rcibx0001dq8mcd9aoyxp	mica-marketing-communications	SATISFIED	{}	\N	\N	Asset-Referenced Token marketing requires compliance with MiCA	\N	2025-09-02 16:56:24.831	2025-09-02 16:56:24.831	\N	iss_1756832184820_zbq4tn71s	\N	\N	\N
cmf2sitj70009qg0psf4czzsj	cmf2rcibx0001dq8mcd9aoyxp	travel-rule-payload	EXCEPTION	{}	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-02 16:56:24.831	2025-09-02 16:56:24.831	\N	iss_1756832184820_zbq4tn71s	\N	\N	\N
cmf2sitj7000bqg0pv73pkpoz	cmf2rcibx0001dq8mcd9aoyxp	xrpl-trustline-auth	EXCEPTION	{}	\N	\N	XRPL requires trustline authorization	\N	2025-09-02 16:56:24.831	2025-09-02 16:56:24.831	\N	iss_1756832184820_zbq4tn71s	\N	\N	\N
cmf2qdblc00039leainwi01u7	cmf2qdbku00019leaj3ur2ecy	travel-rule-payload	SATISFIED	{}	\N	\N	CASP-to-CASP transfers require travel rule information	\N	2025-09-02 15:56:09.072	2025-09-02 18:03:00.201	\N	\N	\N	\N	\N
cmf2qhhrw000b9leaf8ptvl8x	cmf2qhhrk00079leavdvi8o3i	xrpl-trustline-auth	REQUIRED	{}	\N	\N	XRPL requires trustline authorization	\N	2025-09-02 15:59:23.708	2025-09-02 18:05:13.099	\N	\N	\N	\N	\N
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

\unrestrict 1sh8VeE8c92qbIJmK8ACZUfdibM3ZxN51xuUxDUxGOMIycVcARFxOwzA0OKrNcr

