import { rmSync } from 'node:fs';
export default function(){const file=process.env.SHOP_TEST_DATABASE;if(file?.startsWith('/tmp/aynetpremium-e2e-'))for(const suffix of ['', '-wal','-shm'])rmSync(file+suffix,{force:true});}
