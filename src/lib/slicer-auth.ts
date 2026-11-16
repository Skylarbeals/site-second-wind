/** Constant-time check of the workshop slicer runner's shared token. */
export function slicerAuthorized(request: Request): boolean {
  const expected = process.env['SLICER_TOKEN'];
  const given = request.headers.get('x-slicer-token') ?? '';
  if (!expected || expected.length < 16 || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
