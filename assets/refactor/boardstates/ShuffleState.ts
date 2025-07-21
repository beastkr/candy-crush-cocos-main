import { Node, tween, Tween, Vec3 } from 'cc'
import GameConfig from '../../constants/GameConfig'
import Match3Board from '../Match3Board'
import Diamond from '../tile/Diamond'
import BoardState from './BoardState'

class ShuffleState extends BoardState {
    rotateTwin: Tween<Node> | null = null
    promises: Promise<void>[] = []
    movepromises: Promise<void>[] = []
    private run: (() => void)[] = [this.moveAroundCircle, this.moveAroundStar]
    public onEnter(): void {
        this.promises = []
        this.movepromises = []
        const randFunc = this.run[Math.floor(Math.random() * this.run.length)]
        randFunc.call(this)
        this.rotate()
        this.shuffle()
        Promise.all(this.promises).then(() => {
            Promise.all(this.movepromises).then(() => {
                this.board.switchState('fall')
            })
        })
    }
    public moveBack() {
        for (let row = 0; row < GameConfig.GridHeight; row++) {
            for (let col = 0; col < GameConfig.GridWidth; col++) {
                const pos = Match3Board.coordToPos(
                    this.board.board[row][col].getCoordinate().x,
                    this.board.board[row][col].getCoordinate().y
                )
                this.movepromises.push(this.board.board[row][col].move(pos.x, pos.y, 1, 'backOut'))
            }
        }
    }

    private calcStarPos(): { x: number; y: number }[][] {
        const listDia: Diamond[] = []
        for (const row of this.board.board) {
            listDia.push(...row)
        }

        const total = listDia.length
        const starPoints: { x: number; y: number }[] = []

        const outerRadius = 250 // đỉnh ngoài của sao
        const innerRadius = 100 // đỉnh trong của sao
        const centerX = 0
        const centerY = 0
        const pointCount = 10

        // Tính 10 điểm tạo ngôi sao (luân phiên outer - inner)
        for (let i = 0; i < pointCount; i++) {
            const angle = (Math.PI * 2 * i) / pointCount - Math.PI / 2
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            starPoints.push({ x, y })
        }

        // Gán từng diamond vào đoạn nối giữa 2 đỉnh sao
        const segment = Math.floor(total / pointCount)
        const positions: { x: number; y: number }[][] = []
        let index = 0

        for (let i = 0; i < pointCount; i++) {
            const from = starPoints[i]
            const to = starPoints[(i + 1) % pointCount]

            for (let j = 0; j < segment && index < total; j++) {
                const t = j / segment
                const x = from.x * (1 - t) + to.x * t
                const y = from.y * (1 - t) + to.y * t
                const row = Math.floor(index / this.board.board[0].length)
                const col = index % this.board.board[0].length
                if (!positions[row]) positions[row] = []
                positions[row][col] = { x, y }
                index++
            }
        }

        return positions
    }

    public rotate() {
        if (!this.rotateTwin) {
            this.promises.push(
                new Promise<void>((resolve) => {
                    tween(this.board.boardNode!)
                        .repeat(
                            1,
                            tween()
                                .to(3, { eulerAngles: new Vec3(0, 0, 360) })
                                .call(() => {
                                    this.board.boardNode!.eulerAngles = new Vec3(0, 0, 0)
                                })
                        )
                        .call(() => {
                            this.moveBack()
                            this.board.boardNode!.eulerAngles = new Vec3(0, 0, 0)

                            resolve()
                        })
                        .start()
                })
            )
        }
    }

    public onExit(): void {}
    public onUpdate(): void {}
    private shuffle(): void {
        const rows = this.board.board.length
        const cols = this.board.board[0].length

        // 1. Flatten
        const allTiles: Diamond[] = []
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tile = this.board.board[row][col]
                if (tile) allTiles.push(tile)
            }
        }

        // 2. Fisher-Yates shuffle
        for (let i = allTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const temp = allTiles[i]
            allTiles[i] = allTiles[j]
            allTiles[j] = temp
        }

        // 3. Reassign to board and update coordinates
        let index = 0
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tile = allTiles[index]
                tile.setCoordinate(col, row)
                const pos = Match3Board.coordToPos(col, row)
                tile.node.setPosition(pos.x, pos.y)
                this.board.board[row][col] = tile
                index++
            }
        }
    }

    private moveAroundCircle() {
        let visited: Set<{ x: number; y: number }> = new Set<{ x: number; y: number }>()
        let posFlatten = []

        const positions = this.calculateCircularPos(this.board.board, 200)
        for (const row of positions) {
            posFlatten.push(...row)
        }
        for (let row = 0; row < GameConfig.GridHeight; row++) {
            for (let col = 0; col < GameConfig.GridWidth; col++) {
                var bestPos: { x: number; y: number } = { x: 0, y: 0 }
                const dia = this.board.board[row][col]
                let minDis = -1
                posFlatten.forEach((pos) => {
                    const dis = this.calcDistance(pos, {
                        x: dia.node.position.x,
                        y: dia.node.position.y,
                    })
                    if ((dis < minDis || minDis == -1) && !visited.has(pos)) {
                        bestPos = pos
                        minDis = dis
                    }
                })
                visited.add(bestPos)
                this.promises.push(
                    this.board.board[row][col].move(bestPos.x, bestPos.y, 1, 'sineOut')
                )
            }
        }
    }
    calcDistance(first: { x: number; y: number }, second: { x: number; y: number }): number {
        const dx = second.x - first.x
        const dy = second.y - first.y
        return dx * dx + dy * dy
    }

    private moveAroundStar() {
        const positions = this.calcStarPos()
        for (let row = 0; row < GameConfig.GridHeight; row++) {
            for (let col = 0; col < GameConfig.GridWidth; col++) {
                if (positions[row][col])
                    this.promises.push(
                        this.board.board[row][col].move(
                            positions[row][col].x,
                            positions[row][col].y,
                            1,
                            'sineOut'
                        )
                    )
                else {
                    this.promises.push(
                        this.board.board[row][col].move(
                            positions[0][0].x,
                            positions[0][0].y,
                            1,
                            'sineOut'
                        )
                    )
                }
            }
        }
    }
    private calculateCircularPos(
        diamonds: Diamond[][],
        radius: number
    ): { x: number; y: number }[][] {
        const rows = diamonds.length
        const cols = diamonds[0]?.length || 0
        const result: { x: number; y: number }[][] = []

        const centerX = 0
        const centerY = 0
        const total = rows * cols

        for (let row = 0; row < rows; row++) {
            const rowResult: { x: number; y: number }[] = []
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col
                const angle = (2 * Math.PI * index) / total
                const x = centerX + radius * Math.cos(angle)
                const y = centerY + radius * Math.sin(angle)
                rowResult.push({ x, y })
            }
            result.push(rowResult)
        }

        return result
    }
}

export default ShuffleState
