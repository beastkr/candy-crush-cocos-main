import { tween, Vec3 } from 'cc'
import Match3Board from '../Match3Board'
import Diamond from '../tile/Diamond'
import BoardState from './BoardState'

class IdleState extends BoardState {
    private firstChosen: Diamond | null = null
    private secondChosen: Diamond | null = null
    private staple: [boolean, boolean] = [true, true]

    public onEnter(): void {
        if (this.board.checkAll().length > 0) {
            this.board.switchState('kill')
            return
        }
        this.unChoose()
        this.turnOnInput()
    }
    public onExit(): void {
        this.unChoose()
        this.turnOffInput()
    }
    public onUpdate(): void {
        // console.log(this.firstChosen?.getCoordinate())
        if (!this.firstChosen || !this.secondChosen) return
        if (this.isStaple())
            if (this.board.checkAll().length > 0) {
                this.board.switchState('kill')
            } else {
                this.startSwap(this.firstChosen, this.secondChosen, true)
                this.board.switchState('idle')
            }
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
        this.firstChosen?.lightOn()
        this.firstChosen?.chose()
    }

    private startSwap(dia1: Diamond, dia2: Diamond, bounce: boolean = false) {
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
        tween(dia2.node)
            .to(0.2, { position: new Vec3(firstpos.x, firstpos.y) })
            .call(() => {
                this.staple[0] = true
            })
            .start()
        tween(dia1.node)
            .to(0.2, { position: new Vec3(secondpos.x, secondpos.y) })
            .call(() => {
                this.staple[1] = true
            })
            .start()
        if (bounce) this.unChoose()
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
