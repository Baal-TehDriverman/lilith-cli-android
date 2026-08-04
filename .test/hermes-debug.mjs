import { HermesMemoryStore } from '../src/agent/memory_hermes.ts';
async function main() {
  const store = new HermesMemoryStore();
  await store.put('shadow_debug', 'direct-test');
  const v = await store.get('shadow_debug');
  console.log('GET:', v);
}
main();
