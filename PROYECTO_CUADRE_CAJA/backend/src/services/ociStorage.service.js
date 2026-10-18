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
  const client = createObjectStorageClient();
  
  // Calcular la fecha de expiración (por defecto 24 horas)
  const timeExpires = new Date();
  timeExpires.setHours(timeExpires.getHours() + expirationHours);

  try {
    const result = await client.createPreauthenticatedRequest({
      namespaceName: OCI_NAMESPACE,
      bucketName: OCI_BUCKET_NAME,
      createPreauthenticatedRequestDetails: {
        name: `PAR-${objectName}-${Date.now()}`,
        objectName: objectName,
        accessType: 'ObjectRead',
        timeExpires: timeExpires.toISOString()
      }
    });

    // OCI nos devuelve la ruta parcial, ej: /p/.../n/.../b/.../o/...
    const accessUri = result.preauthenticatedRequest.accessUri;
    
    // Construimos la URL completa usando la región
    return `https://objectstorage.${OCI_REGION}.oraclecloud.com${accessUri}`;
  } catch (error) {
    console.error('Error generando URL firmada para OCI:', error);
    return null;
  }
};