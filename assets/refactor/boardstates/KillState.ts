import { tween } from 'cc'
import Match3Board from '../Match3Board'
import Diamond from '../tile/Diamond'
import BoardState from './BoardState'

class KillState extends BoardState {
    private isFirstKill: boolean = false
    private swappedDia: Diamond[] = []
    private promises: Promise<void>[] = []
    private set: Set<Diamond[]> = new Set<Diamond[]>()

    public async onEnter(first: boolean = false, dia: Diamond[] = []): Promise<void> {
        this.set = new Set<Diamond[]>()
        if (this.board.pausing) {
            this.board.switchState('pause')
            return
        }

        console.log('kill')
        this.promises = []

        if (first) {
            this.startKillTurn(dia[0], dia[1])
            await this.firstKill()
        } else {
            await this.killAllSame()
        }

        await Promise.all(this.promises)

        await this.updateSpecial()

        this.pushAll()
        this.pendDone()
        await this.board.switchState('fall')
    }

    public onExit(): void {
        this.isFirstKill = false
        this.swappedDia = []
    }

    public onUpdate(): void {}

    public async updateSpecial() {
        const specialPromises: Promise<void>[] = []
        for (const listDia of this.set) {
            this.makeEffect(listDia)
            listDia[0].pending = false
            specialPromises.push(listDia[0].doShrink(1, 0.2, this.board, false))
        }
        await Promise.all(specialPromises)
    }

    public startKillTurn(dia1: Diamond, dia2: Diamond) {
        this.swappedDia.push(dia1)
        this.swappedDia.push(dia2)
    }

    public async firstKill() {
        const killPromise: Promise<void>[] = []
        killPromise.push(this.killMultipleGrid(this.board.getMatch(this.swappedDia[0])))
        killPromise.push(this.killMultipleGrid(this.board.getMatch(this.swappedDia[1])))
        await Promise.all(killPromise)
    }

    public async killMultipleGrid(diamonds: Diamond[], createEff: boolean = true): Promise<void> {
        const proms: Promise<void>[] = []
        const killproms: Promise<void>[] = []
        if (Match3Board.SoundOn) this.board.diaSFX?.play()

        diamonds = diamonds.filter((d) => !d.pending)
        var count = 0
        // Handle specials sequentially with await
        for (const dia of diamonds) {
            killproms.push(this.handleSpecial(dia))

            if (dia.getEffect() != 'tile') count++
        }

        diamonds = diamonds.filter((d) => !d.pending)
        if (createEff) {
            if (this.isEffectable(diamonds)) {
                this.set.add(diamonds)
            }
        }
        await Match3Board.delay(200)
        for (const dia of diamonds) {
            if (dia.getEffect() == 'tile') {
                const prom = dia.doShrink(0, 0.4, this.board)
                proms.push(prom)
            }
        }

        // Wait until all animations and special kills complete

        // Create new effect tile AFTER all kills done

        // Filter out special tile from shrink list
        const normalTiles = diamonds.filter((d) => d.getEffect() == 'tile')
        for (const dia of normalTiles) {
            proms.push(dia.doShrink(0, 0.4, this.board))
        }

        // await Promise.all(killproms)
        await Promise.all(proms)
        for (const prom of killproms) {
            await prom
        }
    }

    private pendDone() {
        for (const row of this.board.board) {
            for (const d of row) {
                if (d.pending) {
                    d.node.active = false
                    d.pending = false
                    d.getSprite()?.node.setScale(1, 1, 1)
                    d.setType('tile')
                }
            }
        }
    }
    private combine(dia: Diamond) {
        const temp = this.board.getMatch(dia)
        for (const d of temp) {
            this.promises.push(
                new Promise<void>((resolve) => {
                    tween(d.getSprite()!.node)
                        .to(0.2, { position: dia.node.position })
                        .call(() => resolve())
                        .start()
                })
            )
        }
    }

    public async handleSpecial(dia: Diamond): Promise<void> {
        if (dia.getEffect() != 'tile') {
            // Play effect and shrink

            const emit = dia.emitOnKill(this.board)

            // const killPromise: Promise<void>[] = []
            dia.pending = true
            await Promise.all([...emit, dia.doShrink(0, 0.4, this.board)])

            // const relatedDiamonds = dia.getRelative(this.board).filter((dia) => !dia.pending)
            // const relativeNoEffect = relatedDiamonds
            //     .filter((dia) => dia.getEffect() == 'tile')
            //     .filter((dia) => !dia.pending)
            // killPromise.push(this.killMultipleGrid(relativeNoEffect, false))

            // const relativeEffect = relatedDiamonds
            //     .filter((dia) => dia.getEffect() != 'tilree')
            //     .filter((dia) => !dia.pending)
            // await Promise.all(killPromise)

            // await this.killMultipleGrid(relativeEffect, false)
        }

        dia.setEffect('tile')
    }

    addRowEffect(dia: Diamond) {
        // this.combine(dia)
        dia.setEffect('row')
        dia.pending = false
    }

    addColumnEffect(dia: Diamond) {
        // this.combine(dia)
        dia.setEffect('column')
        dia.pending = false
    }

    addExplosionEffect(dia: Diamond) {
        // this.combine(dia)
        dia.setEffect('explosion')
        dia.pending = false
    }

    addRainbowEffect(dia: Diamond) {
        // this.combine(dia)
        dia.setEffect('rainbow')
        dia.pending = false
    }

    public isEffectable(dia: Diamond[]): boolean {
        return dia.length > 3
    }

    makeEffect(dia: Diamond[]): Diamond | null {
        if (dia.length == 4) {
            if (this.board.getVerticleMatch(dia[0]).length == 4) this.addRowEffect(dia[0])
            else this.addColumnEffect(dia[0])
            return dia[0]
        }

        if (dia.length >= 5) {
            if (
                this.board.getVerticleMatch(dia[0]).length == 0 ||
                this.board.getHorizontalMatch(dia[0]).length == 0
            ) {
                this.addRainbowEffect(dia[0])
            } else {
                this.addExplosionEffect(dia[0])
            }
            return dia[0]
        }

        return null
    }

    private async killAllSame(): Promise<void> {
        const visited = new Set<string>()
        const killPromise: Promise<void>[] = []

        for (let row of this.board.board) {
            for (const tile of row) {
                if (!tile.node.active) continue

                const coord = tile.getCoordinate()
                const pos = Match3Board.coordToPos(coord.x, coord.y)
                const key = `${pos.x},${pos.y}`

                if (visited.has(key)) continue

                const match = this.board.getMatch(tile)
                if (match.length < 3) continue

                let bestTile = tile
                let bestSize = match.length

                for (const t of match) {
                    const subMatch = this.board.getMatch(t)
                    if (subMatch.length > bestSize) {
                        bestSize = subMatch.length
                        bestTile = t
                    }
                }

                const finalMatch = this.board.getMatch(bestTile)
                const killKeys: string[] = []

                for (const t of finalMatch) {
                    const c = t.getCoordinate()
                    const p = Match3Board.coordToPos(c.x, c.y)
                    const k = `${p.x},${p.y}`
                    killKeys.push(k)
                }

                let canKill = false
                for (const k of killKeys) {
                    if (!visited.has(k)) {
                        canKill = true
                        break
                    }
                }

                if (!canKill) continue

                for (const k of killKeys) visited.add(k)

                const unmoveTile = finalMatch.filter(
                    (d) => d.getCoordinate().y == d.lastcoordinate.y
                )
                const movedTile = finalMatch.filter(
                    (d) => d.getCoordinate().y != d.lastcoordinate.y
                )
                const matching = [...movedTile, ...unmoveTile]

                killPromise.push(this.killMultipleGrid(matching))
            }
        }
        await Promise.all(killPromise)
    }

    private pushAll() {
        for (const row of this.board.board) {
            for (const dia of row) {
                dia.lastcoordinate = { x: dia.getCoordinate().x, y: dia.getCoordinate().y }
            }
        }

        const rows = this.board.board.length
        const cols = this.board.board[0].length

        for (let x = 0; x < cols; x++) {
            const usedTiles: Diamond[] = []
            const unusedTiles: Diamond[] = []

            for (let y = 0; y < rows; y++) {
                const tile = this.board.board[y][x]
                if (!tile.pending) {
                    usedTiles.push(tile)
                } else {
                    unusedTiles.push(tile)
                    tile.node.setPosition(Match3Board.coordToPos(tile.getCoordinate().x, 0).x, 700)
                }
            }

            const newColumn = [...unusedTiles, ...usedTiles]

            for (let y = 0; y < rows; y++) {
                const tile = newColumn[y]
                tile.getCoordinate().y = y
                this.board.board[y][x] = tile
                tile.setCoordinate(x, y)
            }
        }
    }
}

export default KillState
