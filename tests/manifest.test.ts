import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore JavaScript deployment utility, also used by the host watcher.
import { validateManifest, imageRepository } from '../scripts/deployment-manifest.mjs';
test('deployment manifests reject mutable images, wrong registries and invalid provenance', () => {
  const valid = { schema: 1, image: imageRepository + '@sha256:' + 'a'.repeat(64), commit: 'b'.repeat(40), ciRun: '123', promotionRun: '456', release: 'deploy-456' };
  assert.equal(validateManifest(valid), valid);
  for (const patch of [{ image: imageRepository + ':latest' }, { image: 'evil.example/x@sha256:' + 'a'.repeat(64) }, { commit: 'main' }, { ciRun: '' }, { promotionRun: '-1' }, { release: 'v1' }, { schema: 2 }]) {
    assert.throws(() => validateManifest({ ...valid, ...patch }));
  }
});
