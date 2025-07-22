import { Color } from 'cc'

const GameConfig = {
    GridWidth: 8,
    GridHeight: 8,
    TileWidth: 72,
    TileHeight: 72,
    CandyTypes: ['tile1', 'tile2'], //, 'tile3', 'tile4'], // 'tile7'],
    CandyColor: {
        tile1: new Color(255, 255 / 3, 255 / 3, 255),
        tile2: new Color(255 / 3, 255, 255 / 3, 255),
        tile3: new Color(255 / 3, 255 / 3, 255, 255),

        tile4: new Color(255, 255, 255, 255),
        tile5: new Color(255 / 3, 255, 255, 255),
        tile6: new Color(255, 255 / 3, 255, 255),
        tile7: new Color(255, 255, 0, 255),
        black: new Color(0, 0, 0, 255),
    } as Record<string, Color>,
} as const

export default GameConfig
