/**
 * UUID v4 for local row IDs. Pure JS so it runs identically in Hermes and jest;
 * these IDs never leave the device and need uniqueness, not cryptographic strength.
 */
export function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
