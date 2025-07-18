import { _decorator, tween } from 'cc'
import GameConfig from '../../constants/GameConfig'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
import { SubTile } from './SubTile'
const { ccclass, property } = _decorator

@ccclass('ExplosionSubTile')
export class ExplosionSubTile extends SubTile {
    public getRelative(board: Match3Board): Diamond[] {
        const temp: Diamond[] = []
        const dir = [
            [-1, -1], // top-left
            [0, -1], // top
            [1, -1], // top-right
            [-1, 0], // left
            [1, 0], // right
            [-1, 1], // bottom-left
            [0, 1], // bottom
            [1, 1], // bottom-right
        ]

        for (const direction of dir) {
            if (
                this.diamond.getCoordinate().x + direction[0] < GameConfig.GridWidth &&
                this.diamond.getCoordinate().x + direction[0] >= 0 &&
                this.diamond.getCoordinate().y + direction[1] < GameConfig.GridHeight &&
                this.diamond.getCoordinate().y + direction[1] >= 0
            ) {
                temp.push(
                    board.board[this.diamond.getCoordinate().y + direction[1]][
                        this.diamond.getCoordinate().x + direction[0]
                    ]
                )
            }
        }

        return temp.filter((d) => !d.pending)
    }
    public launch(board: Match3Board): Promise<void>[] {
        // if (!this.diamond.node.active) return []
        console.log('launch expl')
        const prom: Promise<void>[] = []
        const centerPos = this.diamond.node.position
        console.log(centerPos)
        const relative = this.getRelative(board)
        const excluded = new Set(relative.concat(this.diamond))

        for (let y = 0; y < GameConfig.GridHeight; y++) {
            for (let x = 0; x < GameConfig.GridWidth; x++) {
                const dia = board.board[y][x]
                if (!dia || excluded.has(dia)) continue

                const originalPos = dia.node.position.clone()
                const offset = originalPos
                    .clone()
                    .subtract(centerPos)
                    .normalize()
                    .multiplyScalar(30)

                prom.push(
                    new Promise<void>((resolve) => {
                        tween(dia.node)
                            .to(0.1, { position: originalPos.add(offset) }) // move slightly out
                            .to(0.05, { position: originalPos }, { easing: 'bounceOut' }) // return
                            .call(() => resolve())
                            .start()
                    })
                )
            }
        }

        return prom
    }
}
