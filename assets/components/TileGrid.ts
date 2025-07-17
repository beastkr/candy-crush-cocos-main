import { _decorator, Component, tween, Vec3 } from 'cc'
import GameConfig from '../constants/GameConfig'
import GameManager from './GameManager'
import { Tile } from './Tile'
import TilePool from './TilePool'
const { ccclass, property } = _decorator
@ccclass('TileGrid')
export default class TileGrid extends Component {
    private tileTable: Tile[][] = []
    choosingTile: Tile | null = null
    canChoose: boolean = true
    pool: TilePool | null = null
    progress: number = 0
    shuffling: boolean = false
    initTable(): void {
        this.tileTable = []
        // this.schedule(() => {
        //     if (this.choosingTile) return
        //     const t = this.checkAll()
        //     console.log(t[0])
        //     // this.progress += dt
        //     // if (!this.checkPossible()) {
        //     //     this.shuffle()
        //     // }
        //     // this.shuffle()
        //     this.idleRun()
        // }, 50)
    }

    // protected update(dt: number): void {
    //     this.pool?.getList().forEach((element) => {
    //         if (!element.used) {
    //             this.moveUnusedTilesUp()
    //         }
    //     })
    // }

    idleRun() {
        this.pool?.getList().forEach((element) => {
            element.rotateWhole(Math.abs(0.8 - (element.coords.x + element.coords.y) / 20))
        })
    }
    async fillTable(pool: TilePool): Promise<void> {
        this.pool = pool
        const movePromises: Promise<void>[] = []

        for (let y = 0; y < GameConfig.GridHeight; y++) {
            this.tileTable[y] = []
            for (let x = 0; x < GameConfig.GridWidth; x++) {
                const tile = pool.getFirst()
                tile.coords = { x, y }
                this.tileTable[y][x] = tile
                movePromises.push(tile.moveTo(x, y, 0.25, 1, 'bounceOut'))
            }
        }

        // Wait for all initial animations to complete
        await Promise.all(movePromises)

        await this.killAllSame()
    }

    async killAllSame() {
        if (this.shuffling) return
        console.log('kill')
        const allMatches: Tile[][] = []
        const checked = new Set<string>()

        // B1: Thu thập các nhóm match, tránh lặp lại
        for (let row of this.tileTable) {
            for (let tile of row) {
                if (!tile.used) continue

                const pos = tile.getTilePosition()
                const key = `${pos.x},${pos.y}`

                if (!checked.has(key)) {
                    const match = this.getMatch(tile)
                    if (match.length > 0) {
                        allMatches.push(match)
                        for (const t of match) {
                            const p = t.getTilePosition()
                            checked.add(`${p.x},${p.y}`)
                        }
                    }
                }
            }
        }

        // B2: Ưu tiên nhóm dài hơn trước
        allMatches.sort((a, b) => b.length - a.length)

        const visited = new Set<string>()
        const promises: Promise<void>[] = []

        for (const group of allMatches) {
            let canKill = false
            const groupKeys: string[] = []

            for (const tile of group) {
                const pos = tile.getTilePosition()
                const key = `${pos.x},${pos.y}`
                groupKeys.push(key)
                if (!visited.has(key)) canKill = true
            }

            if (canKill) {
                for (const key of groupKeys) visited.add(key)
                promises.push(this.killMultipleGrid(group, true))
            }
        }
        console.log(promises)
        await Promise.all(promises).then(() => this.moveUnusedTilesUp())
    }

    setUpManager(game: GameManager): void {
        this.tileTable.forEach((element) => {
            element.forEach((tile) => {
                tile.addOnClickCallback((tile: Tile) => {
                    console.log('Tile clicked:', tile.coords)
                    game.Chose(tile)
                })
            })
        })
    }

    async moveUnusedTilesUp() {
        console.log('move')
        // this.canChoose = false
        const rows = this.tileTable.length
        const cols = this.tileTable[0].length

        // For each column, move used tiles down and unused tiles up
        for (let x = 0; x < cols; x++) {
            const usedTiles: Tile[] = []
            const unusedTiles: Tile[] = []

            // Separate used and unused tiles in this column
            for (let y = 0; y < rows; y++) {
                const tile = this.tileTable[y][x]
                if (tile.used) {
                    usedTiles.push(tile)
                } else {
                    unusedTiles.push(tile)
                    // Start tile from above the grid and animate it falling down
                    tile.node.setPosition(tile.getTilePosition().x, 500)
                }
            }

            // Place used tiles at the bottom, unused tiles at the top
            let newColumn: Tile[] = []
            newColumn = [...unusedTiles, ...usedTiles]

            // Update the grid and tile coordinates
            for (let y = 0; y < rows; y++) {
                const tile = newColumn[y]
                const oldY = tile.coords.y
                tile.coords.y = y
                this.tileTable[y][x] = tile
            }
        }

        await this.showTile()
        console.log('move call show')
    }

    async showTile(recursively: boolean = true) {
        console.log('tile')
        // await this.moveUnusedTilesUp()
        this.canChoose = true
        const spawnPromises: Promise<void>[] = []
        let spawnCount = 0

        this.tileTable.forEach((row) => {
            row.forEach((tile) => {
                if (tile.used) {
                    const t = tile.node.position.y !== tile.getTilePosition().y
                    spawnPromises.push(
                        tile.moveTo(tile.coords.x, tile.coords.y, 1, 0.8, 'bounceOut', t)
                    )
                } else {
                    // console.log('Spawning tile at:', tile.coords)

                    tile.used = true
                    tile.node.active = true

                    const randomTileType: string =
                        GameConfig.CandyTypes[
                            Math.floor(Math.random() * GameConfig.CandyTypes.length)
                        ]

                    tile.setTileType(randomTileType)

                    spawnPromises.push(
                        tile.moveTo(tile.coords.x, tile.coords.y, 0.5, 0.8, 'bounceOut', true)
                    )

                    spawnCount++
                }
            })
        })
        // if (spawnCount == 0) return

        console.log('Total tiles spawned:', spawnCount)

        await Promise.all(spawnPromises)

        // Check for matches after all tiles have settled
        const matchedTiles = this.checkAll()
        if (matchedTiles.length > 0) {
            if (matchedTiles.length > 0) {
                await this.killAllSame()
                console.log('showtile call kill')
                // this.canChoose = false
            }
        } else {
            this.canChoose = true
        }
    }

    getTileAt(x: number, y: number): Tile | null {
        if (x < 0 || x >= GameConfig.GridWidth || y < 0 || y >= GameConfig.GridHeight) {
            return null
        }
        return this.tileTable[y][x] || null
    }
    async shuffle() {
        this.shuffling = true
        const movePromises: Promise<void>[] = []

        if (!this.pool) return

        for (const tile of this.pool.getList()) {
            const x = Math.floor(Math.random() * GameConfig.GridWidth)
            const y = Math.floor(Math.random() * GameConfig.GridHeight)
            const targetTile = this.tileTable[y][x]

            // Swap tiles and push the promise
            movePromises.push(
                new Promise<void>((resolve) => {
                    tween(tile.node)
                        .to(0.5, { scale: new Vec3(0.8, 0.8) })
                        .to(2, { position: new Vec3(0, 0, 1) }, { easing: 'bounceOut' })
                        .call(async () => {
                            this.swap(tile, targetTile, false, true)
                            resolve()
                        })
                        .start()
                })
            )
        }

        await Promise.all(movePromises)

        this.shuffling = false
        await this.killAllSame()
    }

    getVerticleMatch(tile: Tile): Tile[] {
        let temp: Tile[] = []
        temp.push(tile)
        for (let i = 1; i < GameConfig.GridHeight; i++) {
            if (tile.coords.y + i < GameConfig.GridHeight) {
                const currentTile = this.tileTable[tile.coords.y + i][tile.coords.x]
                if (currentTile && currentTile.getTileType() != tile.getTileType()) {
                    break
                }
                if (currentTile && currentTile.getTileType() === tile.getTileType()) {
                    temp.push(currentTile)
                }
            }
        }
        for (let i = 1; i < GameConfig.GridHeight; i++) {
            if (tile.coords.y - i >= 0) {
                const currentTile = this.tileTable[tile.coords.y - i][tile.coords.x]
                if (currentTile && currentTile.getTileType() != tile.getTileType()) {
                    break
                }
                if (currentTile && currentTile.getTileType() === tile.getTileType()) {
                    temp.push(currentTile)
                }
            }
        }

        return temp.length >= 3 ? temp : []
    }

    async killPend(list: Tile[], combine: boolean = true) {
        const promises: Promise<void>[] = []
        if (list && list.length > 0) {
            const targetPos = new Vec3(list[0].getTilePosition().x, list[0].getTilePosition().y, 0)
            if (combine)
                if (list)
                    list.forEach((element) => {
                        const p = new Promise<void>((resolve) => {
                            tween(element.node)
                                .to(0.2, { position: targetPos })
                                .call(() => resolve())
                                .start()
                        })
                        promises.push(p)
                    })

            await Promise.all(promises)
        }
        // list = list.filter((tile) => tile.used)
    }

    checkAll(list: Tile[][] = this.tileTable) {
        let temp: Tile[] = []
        list.forEach((element) => {
            element.forEach((tile) => {
                temp = [...this.getMatch(tile), ...temp]
            })
        })
        return temp
    }
    getHorizontalMatch(tile: Tile): Tile[] {
        let temp: Tile[] = []
        temp.push(tile)
        for (let i = 1; i < GameConfig.GridWidth; i++) {
            if (tile.coords.x + i < GameConfig.GridWidth) {
                const currentTile = this.tileTable[tile.coords.y][tile.coords.x + i]
                if (currentTile && currentTile.getTileType() != tile.getTileType()) {
                    break
                }
                if (currentTile && currentTile.getTileType() === tile.getTileType()) {
                    temp.push(currentTile)
                }
            }
        }
        for (let i = 1; i < GameConfig.GridHeight; i++) {
            if (tile.coords.x - i >= 0) {
                const currentTile = this.tileTable[tile.coords.y][tile.coords.x - i]
                if (currentTile && currentTile.getTileType() != tile.getTileType()) {
                    break
                }
                if (currentTile && currentTile.getTileType() === tile.getTileType()) {
                    temp.push(currentTile)
                }
            }
        }

        return temp.length >= 3 ? temp : []
    }
    getMatch(tile: Tile): Tile[] {
        var verticleMatch = this.getVerticleMatch(tile)
        var horizontalMatch = this.getHorizontalMatch(tile)
        // console.log('Vertical Match:', verticleMatch.length)
        // console.log('Horizontal Match:', horizontalMatch.length)
        var hoz = []
        if (verticleMatch.length > 0 && verticleMatch.length > 0)
            for (var i = 1; i < horizontalMatch.length; i++) {
                hoz.push(horizontalMatch[i])
            }
        else hoz = horizontalMatch
        return [...verticleMatch, ...hoz]
    }
    getAllVerticle(): Tile[] {
        return []
    }
    getAllHorizontal(): Tile[] {
        return []
    }
    async killGrid(tile: Tile): Promise<void> {
        if (tile.effect == 'tile' && tile.used) {
            await tile.emitOnDead()
            this.pool?.returnPool(tile)
            GameManager.increase()
        }
    }
    async killMultipleGrid(
        list: Tile[],
        eff: boolean = false,
        boom: boolean = false
    ): Promise<void> {
        list = list.filter((tile) => tile.used) || []

        const promises: Promise<void>[] = []

        for (const element of list) {
            if (element.effect !== 'tile') {
                element.setEffect('tile')
                promises.push(this.killGrid(element)) // đảm bảo killGrid là async
            }
        }
        if (list.length >= 5 && eff) {
            const is5H = this.getHorizontalMatch(list[0]).length >= 5
            const is5V = this.getVerticleMatch(list[0]).length >= 5

            if (is5H || is5V) {
                list[0].setEffect('rainbow')
                this.addEffect(list[0], 'rainbow')
            } else {
                list[0].setEffect('explosion')
                this.addEffect(list[0], 'explosion')
            }
        }

        if (list.length === 4 && eff) {
            if (this.getHorizontalMatch(list[0]).length > 0) {
                list[0].setEffect('column')
                this.addEffect(list[0], 'column')
            } else {
                list[0].setEffect('row')
                this.addEffect(list[0], 'row')
            }
        }

        list = list.filter((tile) => tile.used) || []

        // Wait for pend (e.g., chain effect)
        await this.killPend(list, boom)

        for (const element of list) {
            const p = new Promise<void>((resolve) => {
                tween(element.node)
                    .to(0.2, { scale: new Vec3(0, 0, 0) })
                    .call(async () => {
                        if (element.used) await this.killGrid(element) // ✅ await đúng
                        resolve()
                    })
                    .start()
            })
            promises.push(p)
        }

        await Promise.all(promises)
    }

    putGridAt(x: number, y: number): void {}
    getTilePos(x: number, y: number): { x: number; y: number } {
        return { x: 0, y: 0 }
    }
    canMove(tile1: Tile, tile2: Tile): boolean {
        return (
            (tile1.coords &&
                tile2.coords &&
                Math.abs(tile1.coords.x - tile2.coords.x) === 1 &&
                tile1.coords.y === tile2.coords.y) ||
            (Math.abs(tile1.coords.y - tile2.coords.y) === 1 && tile1.coords.x === tile2.coords.x)
        )
    }
    canSwap(tile1: Tile, tile2: Tile): boolean {
        return this.canMove(tile1, tile2)
    }
    async swap(
        tile1: Tile,
        tile2: Tile,
        bounce: boolean = false,
        force: boolean = false
    ): Promise<void> {
        this.canChoose = false
        const pos1 = { ...tile1.coords }
        const pos2 = { ...tile2.coords }

        tile1.coords = pos2
        tile2.coords = pos1

        this.tileTable[pos1.y][pos1.x] = tile2
        this.tileTable[pos2.y][pos2.x] = tile1

        await Promise.all([tile1.moveTo(pos2.x, pos2.y, 0.5), tile2.moveTo(pos1.x, pos1.y, 0.5)])
        if (!force) {
            const matched1 = [...this.getMatch(tile1)]
            const matched2 = [...this.getMatch(tile2)]
            const matched = [...matched1, ...matched2]
            console.log('Matched tiles:', matched.length)

            if (matched.length === 0 && !bounce) {
                tile1.coords = pos1
                tile2.coords = pos2

                this.tileTable[pos1.y][pos1.x] = tile1
                this.tileTable[pos2.y][pos2.x] = tile2

                await Promise.all([tile1.moveTo(pos1.x, pos1.y), tile2.moveTo(pos2.x, pos2.y)])
            } else {
                const promises: Promise<void>[] = []
                if (matched.length > 0) {
                    await Promise.all([
                        this.killMultipleGrid(this.getMatch(tile1), true, false),
                        this.killMultipleGrid(this.getMatch(tile2), true, false),
                    ])
                    await this.moveUnusedTilesUp()
                }
            }
        }
        this.canChoose = true
    }

    addEffect(tile: Tile, eff: string) {
        if (eff == 'row')
            tile.addOnDead(async () => {
                await this.killMultipleGrid(
                    [tile, ...this.tileTable[tile.coords.y].filter((t) => t != tile)],
                    false,
                    true
                )
                // await this.moveUnusedTilesUp()
            })
        if (eff == 'column') {
            tile.addOnDead(async () => {
                // Get the current tiles in the column when the effect is triggered
                const temp: Tile[] = []
                for (let i = 0; i < GameConfig.GridHeight; i++) {
                    temp.push(this.tileTable[i][tile.coords.x])
                }
                await this.killMultipleGrid([tile, ...temp.filter((t) => t != tile)], false, true)
                // await this.moveUnusedTilesUp()
            })
        }
        if (eff == 'explosion') {
            tile.addOnDead(async () => {
                const temp: Tile[] = []
                const pos = tile.coords
                const x = pos.x
                const y = pos.y

                const dirs = [
                    [0, -1], // up
                    [0, 1], // down
                    [-1, 0], // left
                    [1, 0], // right
                    [1, 1],
                    [-1, 1],
                    [-1, -1],
                    [1, -1],
                ]
                temp.push(tile)

                for (const [dx, dy] of dirs) {
                    const newX = x + dx
                    const newY = y + dy
                    if (
                        newX >= 0 &&
                        newX < GameConfig.GridWidth &&
                        newY >= 0 &&
                        newY < GameConfig.GridHeight
                    ) {
                        const neighbor = this.tileTable[newY][newX]
                        if (neighbor && temp.indexOf(neighbor) === -1) {
                            temp.push(neighbor)
                        }
                    }
                }

                await this.killMultipleGrid(temp, false, true)
                // await this.moveUnusedTilesUp()
            })
        }
        if (eff == 'rainbow') {
            tile.addOnDead(async () => {
                const temp: Tile[] = []
                this.pool?.getList().forEach((element) => {
                    if (element.getTileType() == tile.getTileType()) temp.push(element)
                })
                await this.killMultipleGrid([tile, ...temp.filter((t) => t != tile)], false, true)
            })
        }
    }
}
