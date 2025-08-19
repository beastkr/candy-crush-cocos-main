import {
    _decorator,
    Button,
    Component,
    Node,
    resources,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    TweenEasing,
    Vec3,
} from 'cc'

import GameConfig from '../constants/GameConfig'
const { ccclass, property } = _decorator

@ccclass('Tile')
export class Tile extends Component {
    public coords: Vec3 = new Vec3()
    public killed: boolean = false

    @property(Sprite)
    private wholeSprite: Sprite | null = null

    setCoords(x: number, y: number) {

    }
}
