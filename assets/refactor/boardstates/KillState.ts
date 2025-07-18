import { tween } from 'cc'
import Match3Board from '../Match3Board'
import Diamond from '../tile/Diamond'
import BoardState from './BoardState'

class KillState extends BoardState {
    private combinePromise: Promise<void>[] = []
    private promises: Promise<void>[] = []
    public onEnter(): void {
        console.log('kill')
        this.promises = []
        this.combinePromise = []
        this.killAllSame()
        Promise.all(this.promises).then(() => {
            this.pushAll()
            this.pendDone()
            this.board.switchState('fall')
        })
    }
    public onExit(): void {}
    public onUpdate(): void {}

    public killMultipleGrid(diamonds: Diamond[], createEff: boolean = true): void {
        diamonds = diamonds.filter((d) => !d.pending)
        for (const dia of diamonds) {
            this.handleSpecial(dia)
        }
        // diamonds = diamonds.filter((d) => d.node.active)
        if (createEff) {
            this.makeEffect(diamonds) // Tạo hiệu ứng trước khi xử lý kill
        }
        diamonds = diamonds.filter((d) => !d.pending)
        for (const dia of diamonds) {
            if (dia.getEffect() == 'tile') {
                const prom = dia.doShrink(0)
                this.promises.push(prom)
            }
        }
    }
    private pendDone() {
        for (const row of this.board.board) {
            for (const d of row) {
                if (d.pending) {
                    d.node.active = false
                    d.node.setScale(1, 1)
                    d.pending = false
                } else {
                    d.node.setScale(1, 1)
                }
            }
        }
    }
    private combine(dia: Diamond) {
        const temp = this.board.getMatch(dia)
        for (const d of temp) {
            this.promises.push(
                new Promise<void>((resolve) => {
                    tween(d.node)
                        .to(0.2, { position: dia.node.position })
                        .call(() => resolve())
                        .start()
                })
            )
        }
    }

    public handleSpecial(dia: Diamond): void {
        if (dia.getEffect() != 'tile') {
            this.promises.push(...dia.emitOnKill(this.board))
            dia.doShrink(0)
            // Get related diamonds and add them to be processed, but don't recursively call handleSpecial
            const relatedDiamonds = dia.getRelative(this.board)
            this.killMultipleGrid(relatedDiamonds, false)
        }

        dia.setEffect('tile')
    }

    addRowEffect(dia: Diamond) {
        this.combine(dia)
        dia.setEffect('row')
        dia.pending = false
    }
    addColumnEffect(dia: Diamond) {
        this.combine(dia)
        dia.setEffect('column')
        dia.pending = false
    }
    addExplosionEffect(dia: Diamond) {
        this.combine(dia)
        dia.setEffect('explosion')
        dia.pending = false
    }

    addRainbowEffect(dia: Diamond) {
        this.combine(dia)
        dia.setEffect('rainbow')
        dia.pending = false
    }
    makeEffect(dia: Diamond[]) {
        if (dia.length == 4) {
            if (this.board.getVerticleMatch(dia[0]).length == 4) this.addRowEffect(dia[0])
            else this.addRainbowEffect(dia[0])
        }
        if (dia.length >= 5) {
            if (
                this.board.getVerticleMatch(dia[0]).length == 0 ||
                this.board.getHorizontalMatch(dia[0]).length == 0
            ) {
                this.addRainbowEffect(dia[0])
            }
            this.addExplosionEffect(dia[0])
        }
        // if (dia.length > 0) dia[0].node.setScale(new Vec3(1, 1, 1))
    }

    private killAllSame(): void {
        console.log('kill')
        const visited = new Set<string>()

        for (let row of this.board.board) {
            for (const tile of row) {
                if (!tile.node.active) continue

                const coord = tile.getCoordinate()
                const pos = Match3Board.coordToPos(coord.x, coord.y)
                const key = `${pos.x},${pos.y}`

                if (visited.has(key)) continue

                const match = this.board.getMatch(tile)
                if (match.length < 3) continue // Không đủ 3 thì bỏ

                // Tìm tile trong nhóm match này có nhiều match nhất
                let bestTile = tile
                let bestSize = match.length

                for (const t of match) {
                    const subMatch = this.board.getMatch(t)
                    if (subMatch.length > bestSize) {
                        bestSize = subMatch.length
                        bestTile = t
                    }
                }

                // Kill match tại tile nhiều match nhất
                const finalMatch = this.board.getMatch(bestTile)
                const killKeys: string[] = []

                for (const t of finalMatch) {
                    const c = t.getCoordinate()
                    const p = Match3Board.coordToPos(c.x, c.y)
                    const k = `${p.x},${p.y}`
                    killKeys.push(k)
                }

                // Kiểm tra nếu chưa visited thì mới kill
                let canKill = false
                for (const k of killKeys) {
                    if (!visited.has(k)) {
                        canKill = true
                        break
                    }
                }

                if (canKill) {
                    for (const k of killKeys) visited.add(k)
                    this.killMultipleGrid(finalMatch)
                }
            }
        }
    }

    private pushAll() {
        const rows = this.board.board.length
        const cols = this.board.board[0].length

        // For each column, move used tiles down and unused tiles up
        for (let x = 0; x < cols; x++) {
            const usedTiles: Diamond[] = []
            const unusedTiles: Diamond[] = []

            // Separate used and unused tiles in this column
            for (let y = 0; y < rows; y++) {
                const tile = this.board.board[y][x]
                if (!tile.pending) {
                    usedTiles.push(tile)
                } else {
                    unusedTiles.push(tile)
                    // Start tile from above the grid and animate it falling down
                    tile.node.setPosition(Match3Board.coordToPos(tile.getCoordinate().x, 0).x, 700)
                }
            }

            // Place used tiles at the bottom, unused tiles at the top
            let newColumn: Diamond[] = []
            newColumn = [...unusedTiles, ...usedTiles]

            // Update the grid and tile coordinates
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
