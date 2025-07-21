import Match3Board from '../Match3Board'
import BoardState from './BoardState'

class FallState extends BoardState {
    promises: Promise<void>[] = []
    public onEnter(): void {
        if (this.board.pausing) this.board.switchState('pause')
        this.promises = []
        console.log('move down')
        this.reShowTile()
        this.moveDown()
        Promise.all(this.promises).then(() => {
            if (this.board.checkAll().length > 0) this.board.switchState('kill')
            else this.board.switchState('idle')
        })
    }
    public onExit(): void {}
    public onUpdate(): void {}

    private reShowTile() {
        for (var row of this.board.board) {
            for (var dia of row) {
                if (!dia.node.active) {
                    dia.randomType()
                }
                dia.node.setScale(1, 1, 1)
            }
        }
    }

    private moveDown() {
        for (const row of this.board.board) {
            for (const dia of row) {
                const realPos = Match3Board.coordToPos(dia.getCoordinate().x, dia.getCoordinate().y)
                this.promises.push(dia.move(realPos.x, realPos.y))
            }
        }
    }
}
export default FallState
