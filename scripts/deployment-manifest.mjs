export const repository = 'jkznx/cat-coup-project-for-fun';
export const imageRepository = `ghcr.io/${repository}`;
export function validateManifest(value) {
  if (!value || value.schema !== 1 || !/^[a-f0-9]{40}$/.test(value.commit || '') ||
      !/^[1-9][0-9]*$/.test(value.ciRun || '') || !/^[1-9][0-9]*$/.test(value.promotionRun || '') ||
      !new RegExp(`^${imageRepository.replaceAll('.', '\\.')}@sha256:[a-f0-9]{64}$`).test(value.image || '') ||
      value.release !== `deploy-${value.promotionRun}`) throw Error('Invalid deployment manifest');
  return value;
}
