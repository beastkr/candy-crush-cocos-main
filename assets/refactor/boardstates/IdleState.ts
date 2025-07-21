import { tween, Vec3 } from 'cc'
import GameConfig from '../../constants/GameConfig'
import Match3Board from '../Match3Board'
import Diamond from '../tile/Diamond'
import BoardState from './BoardState'

class IdleState extends BoardState {
    private firstChosen: Diamond | null = null
    private secondChosen: Diamond | null = null
    private staple: [boolean, boolean] = [true, true]

    public onEnter(): void {
        if (this.board.getProgress() >= 1) {
            this.board.launchConfetti()
            this.board.turn += 5
            console.log('passMileStone')
            this.board.mileStone *= 2
            this.board.switchState('shuffle')
            return
        }
        if (this.board.isGameOver()) {
            this.board.isOver = true
            return
        }

        if (this.board.checkAll().length > 0) {
            this.board.switchState('kill')
            return
        }
        this.scheduleOnce(this.hint, 10)
        this.schedule(this.idleEffect, 15)
        this.unChoose()
        this.turnOnInput()
    }
    public onExit(): void {
        this.unschedule(this.hint)
        this.unschedule(this.idleEffect)
        this.unhint()
        this.unChoose()
        this.turnOffInput()
    }
    public onUpdate(): void {
        if (this.board.pausing) this.board.switchState('pause')
    }

    public idleEffect() {
        for (const row of this.board.board) {
            for (const dia of row) {
                tween(dia.getSprite()?.node)
                    .to(Math.abs(0.8 - (dia.getCoordinate().x + dia.getCoordinate().y) / 20), {
                        eulerAngles: new Vec3(0, 0, 90),
                    })
                    .call(() => {
                        dia.node.eulerAngles = new Vec3()
                    })
                    .start()
            }
        }
    }
    public unhint() {
        for (const row of this.board.board) {
            for (const dia of row) {
                dia.unhint()
            }
        }
    }

    public hint(show: boolean = true) {
        for (let y = 0; y < GameConfig.GridHeight; y++) {
            for (let x = 0; x < GameConfig.GridWidth; x++) {
                const dia = this.board.board[y][x]
                const neighbors = this.getAdjacentDiamonds(x, y)
                for (const neighbor of neighbors) {
                    // Swap tạm
                    this.swapDiamonds(dia, neighbor)

                    const matched = this.board.checkAll()
                    // Swap lại về vị trí ban đầu
                    this.swapDiamonds(dia, neighbor)

                    if (matched.length > 0 && show) {
                        // Highlight hai viên làm gợi ý
                        dia.hint()
                        neighbor.hint()
                        return
                    }
                }
            }
        }
    }
    private getAdjacentDiamonds(x: number, y: number): Diamond[] {
        const adj: Diamond[] = []
        if (x > 0) adj.push(this.board.board[y][x - 1])
        if (x < GameConfig.GridWidth - 1) adj.push(this.board.board[y][x + 1])
        if (y > 0) adj.push(this.board.board[y - 1][x])
        if (y < GameConfig.GridHeight - 1) adj.push(this.board.board[y + 1][x])
        return adj
    }

    private swapDiamonds(d1: Diamond, d2: Diamond): void {
        const coord1 = d1.getCoordinate()
        const coord2 = d2.getCoordinate()

        d1.setCoordinate(coord2.x, coord2.y)
        d2.setCoordinate(coord1.x, coord1.y)

        this.board.board[coord1.y][coord1.x] = d2
        this.board.board[coord2.y][coord2.x] = d1
    }

    private turnOnInput() {
        for (const row of this.board.board) {
            for (const diamond of row) {
                diamond.addOnclickCallbacks((diamond: Diamond) => {
                    this.choose(diamond)
                })
            }
        }
    }

    private turnOffInput() {
        for (const row of this.board.board) {
            for (const diamond of row) {
                diamond.removeOnClickCallbacks()
            }
        }
    }
    private isNextTo(dia1: Diamond, dia2: Diamond): boolean {
        const dx = Math.abs(dia1.getCoordinate().x - dia2.getCoordinate().x)
        const dy = Math.abs(dia1.getCoordinate().y - dia2.getCoordinate().y)
        return (dx == 0 && dy == 1) || (dx == 1 && dy == 0)
    }

    private choose(diamond: Diamond) {
        this.unschedule(this.idleEffect)
        this.schedule(this.idleEffect, 15)
        console.log(diamond.getCoordinate())
        if (this.firstChosen == null) {
            this.firstChosen = diamond
            this.showCursor()
        } else {
            if (diamond.getCoordinate() == this.firstChosen.getCoordinate()) {
                this.unChoose()
                console.log('click same, unchoose')
                return
            }
            this.secondChosen = diamond
            if (this.isNextTo(this.firstChosen, this.secondChosen)) {
                console.log('yeah, you make it near')
                this.startSwap(this.firstChosen, this.secondChosen)
            } else {
                this.unChoose()
                this.firstChosen = diamond
                this.showCursor()
            }
        }
    }
    private isStaple(): boolean {
        return this.staple[1] && this.staple[0]
    }

    private showCursor() {
        this.board.cursor!.node.active = true
        this.board.cursor!.node.setPosition(this.firstChosen!.node.position)
        tween(this.board.cursor!.node)
            .repeatForever(
                tween()
                    .to(0.5, { scale: new Vec3(1.2, 1.2) })
                    .to(0.5, { scale: new Vec3(1, 1) })
            )
            .start()
        this.firstChosen?.lightOn()
        this.firstChosen?.chose()
    }

    private startSwap(dia1: Diamond, dia2: Diamond, bounce: boolean = false) {
        const promises: Promise<void>[] = []
        this.firstChosen?.release()
        this.staple = [false, false]
        this.turnOffInput()
        const firstpos = Match3Board.coordToPos(dia1.getCoordinate().x, dia1.getCoordinate().y)
        const secondpos = Match3Board.coordToPos(dia2.getCoordinate().x, dia2.getCoordinate().y)
        const temp = dia1.getCoordinate()
        dia1.setCoordinate(dia2.getCoordinate().x, dia2.getCoordinate().y)
        dia2.setCoordinate(temp.x, temp.y)
        this.board.board[dia1.getCoordinate().y][dia1.getCoordinate().x] = dia1
        this.board.board[temp.y][temp.x] = dia2
        promises.push(
            new Promise<void>((resolve) => {
                tween(dia2.node)
                    .to(0.2, { position: new Vec3(firstpos.x, firstpos.y) })
                    .call(() => {
                        resolve()
                    })
                    .start()
            })
        )
        promises.push(
            new Promise<void>((resolve) => {
                tween(dia1.node)
                    .to(0.2, { position: new Vec3(secondpos.x, secondpos.y) })
                    .call(() => {
                        resolve()
                    })
                    .start()
            })
        )
        if (!bounce)
            Promise.all(promises).then(() => {
                if (this.board.checkAll().length > 0) {
                    this.board.switchState('kill', true, [dia1, dia2])
                    this.board.turn -= 1
                } else {
                    this.startSwap(dia1, dia2, true)
                }
            })
        else
            Promise.all(promises).then(() => {
                this.board.switchState('idle')
            })
    }

    private unChoose() {
        this.firstChosen?.lightOff()
        this.firstChosen?.release()
        this.firstChosen = null
        this.secondChosen = null

        this.board.cursor!.node.active = false
    }
}
export default IdleState
