import { PrismaClient } from '@prisma/client';
import { ComplianceManifestBuilder } from '../src/lib/complianceManifest.js';
import { RequirementSnapshotService } from '../src/lib/requirementSnapshot.js';

const prisma = new PrismaClient();

describe('Unified Compliance Design', () => {
  let testOrg: any;
  let testProduct: any;
  let testAsset: any;
  let testIssuance: any;

  beforeAll(async () => {
    // Create test organization
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org',
        country: 'DE',
        status: 'ACTIVE'
      }
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        organizationId: testOrg.id,
        assetClass: 'ART',
        status: 'ACTIVE'
      }
    });

    // Create test asset
    testAsset = await prisma.asset.create({
      data: {
        assetRef: 'TEST_ASSET_001',
        ledger: 'XRPL',
        network: 'TESTNET',
        code: 'TEST',
        decimals: 6,
        productId: testProduct.id,
        status: 'ACTIVE'
      }
    });

    // Create test issuance
    testIssuance = await prisma.issuance.create({
      data: {
        assetId: testAsset.id,
        holder: 'rTestHolder123456789012345678901234',
        amount: '1000000',
        status: 'SUBMITTED',
        anchor: false
      }
    });
  });

  afterAll(async () => {
    await prisma.issuance.deleteMany({ where: { assetId: testAsset.id } });
    await prisma.asset.deleteMany({ where: { productId: testProduct.id } });
    await prisma.product.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.organization.deleteMany({ where: { id: testOrg.id } });
    await prisma.$disconnect();
  });

  test('should create requirement snapshots', async () => {
    const snapshotService = new RequirementSnapshotService(prisma);
    
    // Create some live requirements first
    await prisma.requirementInstance.create({
      data: {
        assetId: testAsset.id,
        requirementTemplateId: 'test-template-id',
        status: 'SATISFIED',
        rationale: 'Test requirement satisfied'
      }
    });

    // Create snapshot
    await snapshotService.createIssuanceSnapshot(testAsset.id, testIssuance.id);

    // Verify snapshot was created
    const snapshots = await snapshotService.getIssuanceSnapshot(testIssuance.id);
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].issuanceId).toBe(testIssuance.id);
  });

  test('should build compliance manifest', async () => {
    const manifestBuilder = new ComplianceManifestBuilder(prisma);
    
    const issuanceFacts = {
      purpose: 'Test issuance',
      isin: 'DE1234567890'
    };

    const manifest = await manifestBuilder.buildManifest(testIssuance.id, issuanceFacts);
    
    expect(manifest).toBeDefined();
    expect(manifest.asset_id).toBe(testAsset.id);
    expect(manifest.issuance_facts.purpose).toBe('Test issuance');
    expect(manifest.issuance_facts.isin).toBe('DE1234567890');
  });

  test('should generate manifest hash', async () => {
    const manifestBuilder = new ComplianceManifestBuilder(prisma);
    
    const issuanceFacts = {
      purpose: 'Test issuance'
    };

    const manifest = await manifestBuilder.buildManifest(testIssuance.id, issuanceFacts);
    const hash = manifestBuilder.generateManifestHash(manifest);
    
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 hex string
  });
});
