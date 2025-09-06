-- AddForeignKey
ALTER TABLE "AuthorizationRequest" ADD CONSTRAINT "AuthorizationRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
