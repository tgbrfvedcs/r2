import { OrderPair, ActivePairStore } from './types';
import * as level from 'level';
import Order from './Order';
import { v1 as uuid } from 'uuid';
import * as mkdirp from 'mkdirp';

const keyName = 'ActivePair';
const nilUuid = '00000000-0000-0000-0000-000000000000';
const lastUuid = 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF';
const firstTimestamp = '0000000000000';
const lastTimestamp = '9999999999999';
const queryAll = {
  gt: `${keyName}/${firstTimestamp}/${nilUuid}`,
  lt: `${keyName}/${lastTimestamp}/${lastUuid}`
};

export default class ActivePairLevelStore implements ActivePairStore {
  static path = `${process.cwd()}/datastore/main`;
  db: any;

  constructor(path: string) {
    mkdirp.sync(path);
    this.db = level(path, { keyEncoding: 'utf-8', valueEncoding: 'json' });
  }

  async get(key: string): Promise<OrderPair> {
    const restored = await this.db.get(key);
    return restored.map(o => {
      const newObject = Object.create(Order.prototype);
      return Object.assign(newObject, o);
    });
  }

  getAll(): Promise<{ key: string; value: OrderPair }[]> {
    const kvArray: { key: string; value: OrderPair }[] = [];
    return new Promise((resolve, reject) =>
      this.db
        .createReadStream(queryAll)
        .on('data', kv => {
          kvArray.push({
            key: kv.key,
            value: kv.value.map(o => {
              const newObject = Object.create(Order.prototype);
              return Object.assign(newObject, o);
            })
          });
        })
        .on('end', () => resolve(kvArray))
    );
  }

  // key must be generated by generateKey.
  async put(key: string, value: OrderPair): Promise<void> {
    await this.db.put(key, value);
  }

  async del(key: string): Promise<void> {
    await this.db.del(key);
  }

  async delAll(): Promise<{}> {
    return new Promise((resolve, reject) =>
      this.db
        .createKeyStream(queryAll)
        .on('data', key => this.db.del(key))
        .on('end', () => resolve({}))
    );
  }

  generateKey() {
    return `${keyName}/${Date.now()}/${uuid()}`;
  }
}
