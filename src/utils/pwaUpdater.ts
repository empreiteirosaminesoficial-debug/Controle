/**
 * PWA Updater Wrapper
 * Mantém compatibilidade com importações anteriores
 */
import { registerPWA } from '../lib/pwa';

export function registerPWAUpdater() {
  registerPWA();
}
