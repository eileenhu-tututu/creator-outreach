export const isDemoMode = () => process.env.APP_MODE === 'demo';

export const requestCredential = (
  request: Request,
  headerName: string,
  environmentName: string,
) => {
  const supplied = request.headers.get(headerName)?.trim() || '';
  if (isDemoMode()) return supplied;
  return process.env[environmentName]?.trim() || supplied;
};
