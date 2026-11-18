import { CORE_THRESHOLDS, packageTestConfig } from '@zooloo/vitest-config';

// Pacote de risco alto (doc 12 §6.2): mesmas metas do núcleo financeiro, RNF-QA-02.
export default packageTestConfig(CORE_THRESHOLDS);
