
/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import fs              from "node:fs"
import locks           from "locks"
import writeFileAtomic from "write-file-atomic"

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

    /*  perform atomic read  */
    async readFile (filename: string) {
        return fs.promises.readFile(filename, { encoding: "utf8" })
    }

    /*  perform atomic read/write  */
    async writeFile (filename: string, data: any) {
        const oldname = (i: number) => `${filename}.OLD.${i}`
        if (await (fs.promises.stat(oldname(9)).then(() => true).catch(() => false)))
            await (fs.promises.unlink(oldname(9)).then(() => true).catch(() => false))
        for (let i = 8; i >= 1; i--)
            if (await (fs.promises.stat(oldname(i)).then(() => true).catch(() => false)))
                await (fs.promises.rename(oldname(i), oldname(i + 1)).then(() => true).catch(() => false))
        await (fs.promises.copyFile(filename, oldname(1)).then(() => true).catch(() => false))
        return writeFileAtomic(filename, data, { encoding: "utf8" })
    }
}

