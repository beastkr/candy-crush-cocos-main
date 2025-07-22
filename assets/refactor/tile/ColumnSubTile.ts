import { _decorator, tween, Vec3 } from 'cc'
import GameConfig from '../../constants/GameConfig'
import KillState from '../boardstates/KillState'
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
        const relative = this.getRelative(board)
        const pos = Match3Board.coordToPos(
            this.diamond.getCoordinate().x,
            this.diamond.getCoordinate().y
        )
        if (!this.diamond.node.active) return []
        const prom: Promise<void>[] = []
        const firsteff = this.diamond.rowFX[0]
        const secondeff = this.diamond.rowFX[1]
        console.log(secondeff)
        firsteff.node.active = true
        secondeff.node.active = true
        firsteff.node.setPosition(new Vec3(pos.x, pos.y))
        secondeff.node.setPosition(new Vec3(pos.x, pos.y))
        firsteff.node.setRotationFromEuler(0, 0, 270)

        secondeff.node.setRotationFromEuler(0, 0, 90)
        const firstPos = new Vec3(pos.x, pos.y + 1000)
        const secondPos = new Vec3(pos.x, pos.y - 1000)

        console.log(secondPos)

        tween(firsteff.node)
            .to(0.35, { position: new Vec3(firstPos.x, firstPos.y) })
            .call(() => {
                firsteff.node.active = false
                firsteff.node.setPosition(new Vec3(pos.x, pos.y))
            })
            .start()

        tween(secondeff.node)
            .to(0.35, { position: new Vec3(secondPos.x, secondPos.y) })
            .call(() => {
                console.log('done')
                secondeff.node.active = false
                secondeff.node.setPosition(new Vec3(pos.x, pos.y))
            })
            .start()
        prom.push(this.diamond.doShrink(0, 0.5, board, true))
        for (const d of relative) {
            if (d.pending) continue
            prom.push(
                (async () => {
                    await Match3Board.delay(
                        30 * Math.abs(d.getCoordinate().y - this.diamond.getCoordinate().y)
                    )

                    let shrink: Promise<void> = new Promise<void>(() => {})
                    if (d.getEffect() == 'tile') shrink = d.doShrink(0, 0.5, board)
                    else shrink = d.doShrink(0, 0.5, board, false)

                    if (d.getEffect() != 'tile' && board.getCurrentState() instanceof KillState) {
                        await Promise.all([
                            shrink,
                            (board.getCurrentState() as KillState).killMultipleGrid([d], false),
                        ])
                    } else {
                        await shrink
                    }
                })()
            )
        }

        return prom
    }
}
