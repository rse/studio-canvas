
/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import locks from "locks"

export enum Transaction { READ, WRITE }

export default class DB {
    private lock: locks.ReadWriteLock
    constructor (
    ) {
        this.lock = locks.createReadWriteLock()
    }
    async init () {
    }

    /*  establish database read/write locked access  */
    transaction (type = Transaction.READ, timeout = 4000, transaction: () => any) {
        return new Promise((resolve, reject) => {
            const cb = async (error: Error) => {
                if (error)
                    reject(new Error(`transaction locking failed: ${error}`))
                else
                    try {
                        const result = await transaction()
                        this.lock.unlock()
                        resolve(result)
                    }
                    catch (err) {
                        reject(err)
                    }
            }
            if (type === Transaction.READ)
                this.lock.timedReadLock(timeout, cb)
            else if (type === Transaction.WRITE)
                this.lock.timedWriteLock(timeout, cb)
            else
                reject(new Error("transaction call failed: invalid transaction type"))
        })
    }
}
