import { _decorator, tween, Vec3 } from 'cc'
import GameConfig from '../../constants/GameConfig'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
import { SubTile } from './SubTile'
const { ccclass, property } = _decorator

@ccclass('ColumnSubTile')
export class ColumnSubTile extends SubTile {
    public getRelative(board: Match3Board): Diamond[] {
        const temp: Diamond[] = []
        for (let y = 0; y < GameConfig.GridHeight; y++) {
            temp.push(board.board[y][this.diamond.getCoordinate().x])
        }

        return temp.filter((d) => !d.pending).filter((d) => d != this.diamond)
    }
    public launch(board: Match3Board): Promise<void>[] {
        if (!this.diamond.node.active) return []
        const prom: Promise<void>[] = []
        const firsteff = this.diamond.rowFX[0]
        const secondeff = this.diamond.rowFX[1]
        console.log(secondeff)
        firsteff.node.active = true
        secondeff.node.active = true
        firsteff.node.setPosition(this.diamond.node.position)
        secondeff.node.setPosition(this.diamond.node.position)
        firsteff.node.setRotationFromEuler(0, 0, 270)

        secondeff.node.setRotationFromEuler(0, 0, 90)
        const firstPos = new Vec3(this.diamond.node.position.x, this.diamond.node.position.y + 1000)
        const secondPos = new Vec3(
            this.diamond.node.position.x,
            this.diamond.node.position.y - 1000
        )

        console.log(secondPos)

        tween(firsteff.node)
            .to(0.35, { position: new Vec3(firstPos.x, firstPos.y) })
            .call(() => {
                firsteff.node.active = false
                firsteff.node.setPosition(this.diamond.node.position)
            })
            .start()

        tween(secondeff.node)
            .to(0.35, { position: new Vec3(secondPos.x, secondPos.y) })
            .call(() => {
                console.log('done')
                secondeff.node.active = false
                secondeff.node.setPosition(this.diamond.node.position)
            })
            .start()

        return prom
    }
}
