import 'dotenv/config';
import fs from 'fs';
import oci from 'oci-sdk';

const {
  OCI_USER_OCID,
  OCI_TENANCY_OCID,
  OCI_FINGERPRINT,
  OCI_REGION,
  OCI_NAMESPACE,
  OCI_BUCKET_NAME,
  OCI_PRIVATE_KEY_PATH
} = process.env;

const PREAUTH_CACHE_TTL_MS = 60 * 60 * 1000;
const PREAUTH_CACHE_SAFETY_MS = 5 * 60 * 1000;
const preauthenticatedRequestCache = new Map();
const pendingPreauthenticatedRequests = new Map();

const createObjectStorageClient = () => {
  const privateKey = fs.readFileSync(
    OCI_PRIVATE_KEY_PATH,
    'utf8'
  );

  const provider = new oci.SimpleAuthenticationDetailsProvider(
    OCI_TENANCY_OCID,
    OCI_USER_OCID,
    OCI_FINGERPRINT,
    privateKey,
    null
  );

  const client = new oci.objectstorage.ObjectStorageClient({
    authenticationDetailsProvider: provider
  });

  client.regionId = OCI_REGION;

  return client;
};

export const uploadObject = async ({
  objectName,
  filePath,
  contentType
}) => {
  const client = createObjectStorageClient();

  const fileStream = fs.createReadStream(filePath);

  const result = await client.putObject({
    namespaceName: OCI_NAMESPACE,
    bucketName: OCI_BUCKET_NAME,
    objectName,
    putObjectBody: fileStream,
    contentType
  });

  return {
    objectName,
    etag: result.eTag ?? null
  };
};

export const deleteObject = async (objectName) => {
  const client = createObjectStorageClient();

  await client.deleteObject({
    namespaceName: OCI_NAMESPACE,
    bucketName: OCI_BUCKET_NAME,
    objectName
  });

  return {
    objectName,
    deleted: true
  };
};

export const generatePreauthenticatedRequest = async (objectName, expirationHours = 24) => {
  const cacheKey = `${expirationHours}:${objectName}`;
  const cached = preauthenticatedRequestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  if (cached) {
    preauthenticatedRequestCache.delete(cacheKey);
  }

  const pendingRequest = pendingPreauthenticatedRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = Promise.resolve().then(async () => {
    try {
      const client = createObjectStorageClient();
      const timeExpires = new Date();
      timeExpires.setHours(timeExpires.getHours() + expirationHours);

      const result = await client.createPreauthenticatedRequest({
        namespaceName: OCI_NAMESPACE,
        bucketName: OCI_BUCKET_NAME,
        createPreauthenticatedRequestDetails: {
          name: `PAR-${objectName}-${Date.now()}`,
          objectName,
          accessType: 'ObjectRead',
          timeExpires: timeExpires.toISOString()
        }
      });

      const accessUri = result.preauthenticatedRequest.accessUri;
      const url = `https://objectstorage.${OCI_REGION}.oraclecloud.com${accessUri}`;
      const requestedTtlMs = expirationHours * 60 * 60 * 1000;
      const cacheTtlMs = Math.max(
        0,
        Math.min(PREAUTH_CACHE_TTL_MS, requestedTtlMs - PREAUTH_CACHE_SAFETY_MS)
      );

      if (cacheTtlMs > 0) {
        preauthenticatedRequestCache.set(cacheKey, {
          url,
          expiresAt: Date.now() + cacheTtlMs
        });
      }

      return url;
    } catch (error) {
      console.error('Error generando URL firmada para OCI:', error);
      return null;
    } finally {
      pendingPreauthenticatedRequests.delete(cacheKey);
    }
  });

  pendingPreauthenticatedRequests.set(cacheKey, request);
  return request;
};
