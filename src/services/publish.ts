import path from 'path';

import { writeJsonAtomic, ensureDir } from './file.service';
import { exportMenu } from './menu.service';
import { nextSeq } from './seq';

export type PublishResult = {
  version: number;
  exportedAt: string;
  checksum: string;
  paths: {
    menuJson: string;
    versionJson: string;
  };
};

/**
 * Generate /public/data/menu.json and /public/data/version.json
 * This is what the mobile app consumes.
 */
export async function publish(publicDir: string): Promise<PublishResult> {
  const exportedAt = new Date().toISOString();

  const { menu, checksum } = await exportMenu(exportedAt);

  // monotonically increasing menu version
  const version = await nextSeq('menu_version', 1);

  const dataDir = path.join(publicDir, 'data');
  await ensureDir(dataDir);

  const menuJsonPath = path.join(dataDir, 'menu.json');
  const versionJsonPath = path.join(dataDir, 'version.json');

  await Promise.all([
    writeJsonAtomic(menuJsonPath, menu),
    writeJsonAtomic(versionJsonPath, { version, exportedAt, checksum }),
  ]);

  return {
    version,
    exportedAt,
    checksum,
    paths: { menuJson: menuJsonPath, versionJson: versionJsonPath },
  };
}

/**
 * Backward-compatible name used by admin.controller.ts
 */
export async function publishAll(publicDir: string): Promise<PublishResult> {
  return publish(publicDir);
}
