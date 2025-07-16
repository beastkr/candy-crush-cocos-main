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
    initTable(): void {
        this.tileTable = []
    }

    protected update(dt: number): void {
        if (this.choosingTile) this.progress = 0
        this.progress += dt
        console.log('Progress:', this.progress)
        if (this.progress >= 10) {
            const t = this.checkAll()
            console.log(t[0])
            // this.progress += dt
            // if (!this.checkPossible()) {
            //     this.shuffle()
            // }
            this.shuffle()
            this.idleRun()
            this.progress = 0
        }
    }

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

        // Check for initial matches and handle them
        const temp = this.checkAll()
        if (temp.length > 0) {
            await this.killAllSame()
            await this.showTile()
        }
    }

    async killAllSame() {
        const PromiseKill: Promise<void>[] = []
        for (let row of this.tileTable) {
            for (let tile of row) {
                if (tile.used) {
                    const temp = this.getMatch(tile)
                    if (temp.length > 0) PromiseKill.push(this.killMultipleGrid(temp))
                }
            }
        }
        await Promise.all(PromiseKill)
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
        this.canChoose = false
        const rows = this.tileTable.length
        const cols = this.tileTable[0].length
        const movePromises: Promise<void>[] = []

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

        await Promise.all(movePromises)
    }

    async showTile() {
        await this.moveUnusedTilesUp() // Ensure movement is complete

        const spawnPromises: Promise<void>[] = []
        let spawnCount = 0

        // Only spawn tiles for unused positions (empty spaces that need to be filled)
        this.tileTable.forEach((row) => {
            row.forEach((tile) => {
                if (tile.used) {
                    let t = tile.node.position.y != tile.getTilePosition().y
                    tile.moveTo(tile.coords.x, tile.coords.y, 1, 0.8, 'bounceOut', t)
                }
                if (!tile.used) {
                    console.log('Spawning tile at:', tile.coords)

                    tile.used = true
                    tile.node.active = true

                    const randomTileType: string =
                        GameConfig.CandyTypes[
                            Math.floor(Math.random() * GameConfig.CandyTypes.length)
                        ]

                    tile.setTileType(randomTileType)

                    // Start tile from above the grid and animate it falling down
                    tile.node.setPosition(tile.getTilePosition().x, tile.getTilePosition().y + 200)
                    if (spawnPromises.length == 0)
                        spawnPromises.push(
                            tile.moveTo(tile.coords.x, tile.coords.y, 0.5, 0.8, 'bounceOut', true)
                        )
                    else {
                        tile.moveTo(tile.coords.x, tile.coords.y, 0.5, 0.8, 'bounceOut', true)
                    }
                    spawnCount++
                }
            })
        })

        console.log('Total tiles spawned:', spawnCount)
        await Promise.all(spawnPromises)

        // Check for matches after all tiles have settled
        const matchedTiles = this.checkAll()
        if (matchedTiles.length > 0) {
            await this.killAllSame()
            await this.showTile() // Recurse again
        }
        this.canChoose = true
    }

    getTileAt(x: number, y: number): Tile | null {
        if (x < 0 || x >= GameConfig.GridWidth || y < 0 || y >= GameConfig.GridHeight) {
            return null
        }
        return this.tileTable[y][x] || null
    }
    async shuffle() {
        this.pool?.getList().forEach((element) => {
            let x = Math.floor(Math.random() * GameConfig.GridWidth)
            let y = Math.floor(Math.random() * GameConfig.GridHeight)
            this.swap(element, this.tileTable[x][y], false, true)
        })
        await this.killAllSame()
        await this.showTile()
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

    async killPend(list: Tile[]) {
        const promises: Promise<void>[] = []

        const targetPos = new Vec3(list[0].getTilePosition().x, list[0].getTilePosition().y, 0)

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
        const verticleMatch = this.getVerticleMatch(tile)
        const horizontalMatch = this.getHorizontalMatch(tile)
        console.log('Vertical Match:', verticleMatch.length)
        console.log('Horizontal Match:', horizontalMatch.length)
        return [...verticleMatch, ...horizontalMatch]
    }
    getAllVerticle(): Tile[] {
        return []
    }
    getAllHorizontal(): Tile[] {
        return []
    }
    killGrid(tile: Tile): void {
        this.pool?.returnPool(tile)
    }
    async killMultipleGrid(list: Tile[]) {
        await this.killPend(list)

        const promises: Promise<void>[] = []

        list.forEach((element) => {
            const p = new Promise<void>((resolve) => {
                tween(element.node)
                    .to(0.2, { scale: new Vec3(0, 0, 0) })
                    .call(() => {
                        if (element.used) this.killGrid(element)
                        resolve()
                    })
                    .start()
            })
            promises.push(p)
        })

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
                if (matched1.length > 0) promises.push(this.killMultipleGrid(matched1))
                if (matched2.length > 0) promises.push(this.killMultipleGrid(matched2))
                await Promise.all(promises)
                await this.showTile()
            }
        }
    }

    bounce(tile1: Tile, tile2: Tile): void {}
}
