import { z } from 'zod'

export const PROTOCOL_VERSION = 1 as const

const identifierPattern = /^[A-Za-z0-9_-]+$/
const roomCodePattern = /^[A-Z2-9]{6}$/

export const roomIdSchema = z.string().min(8).max(128).regex(identifierPattern)
export const roomCodeSchema = z.string().regex(roomCodePattern)
export const playerIdSchema = z.string().min(8).max(128).regex(identifierPattern)
export const hostIdSchema = z.string().min(8).max(128).regex(identifierPattern)
export const actionIdSchema = z.string().min(8).max(128).regex(identifierPattern)
export const reconnectTokenSchema = z.string().min(32).max(256).regex(identifierPattern)
export const revisionSchema = z.number().int().nonnegative().safe()
export const playerNameInputSchema = z.string().min(1).max(64)
export const roleSchema = z.enum(['display-host', 'player'])
export const sessionPhaseSchema = z.enum(['lobby', 'started', 'closed'])
export const gameModeSchema = z.enum(['classic', 'chaos'])
export const allowedActionSchema = z.enum([
  'player.rename',
  'player.set-ready',
  'room.set-mode',
  'room.remove-player',
  'room.start',
  'room.close',
])

export const errorCodeSchema = z.enum([
  'INVALID_MESSAGE',
  'INVALID_INPUT',
  'INVALID_NAME',
  'NAME_TAKEN',
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'WRONG_PHASE',
  'NOT_AUTHORIZED',
  'PLAYER_NOT_FOUND',
  'MIN_PLAYERS',
  'PLAYERS_NOT_READY',
  'STALE_REVISION',
  'ACTION_ID_CONFLICT',
  'INVALID_RECONNECT_TOKEN',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
])

const actionMetadataShape = {
  version: z.literal(PROTOCOL_VERSION),
  actionId: actionIdSchema,
  expectedRevision: revisionSchema,
}

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.create'),
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.join'),
    roomCode: roomCodeSchema,
    name: playerNameInputSchema,
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.reconnect-player'),
    roomCode: roomCodeSchema,
    playerId: playerIdSchema,
    reconnectToken: reconnectTokenSchema,
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.reconnect-host'),
    roomCode: roomCodeSchema,
    hostId: hostIdSchema,
    reconnectToken: reconnectTokenSchema,
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('player.rename'),
    name: playerNameInputSchema,
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('player.set-ready'),
    ready: z.boolean(),
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.set-mode'),
    mode: gameModeSchema,
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.remove-player'),
    playerId: playerIdSchema,
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.start'),
  }).strict(),
  z.object({
    ...actionMetadataShape,
    type: z.literal('room.close'),
  }).strict(),
])

export const publicPlayerViewSchema = z.object({
  playerId: playerIdSchema,
  name: z.string().min(1).max(64),
  seat: z.number().int().nonnegative(),
  ready: z.boolean(),
  connected: z.boolean(),
}).strict()

export const publicSessionViewSchema = z.object({
  visibility: z.literal('public'),
  roomId: roomIdSchema,
  roomCode: roomCodeSchema,
  phase: sessionPhaseSchema,
  revision: revisionSchema,
  selectedMode: gameModeSchema.nullable(),
  hostConnected: z.boolean(),
  minPlayers: z.literal(2),
  maxPlayers: z.literal(8),
  players: z.array(publicPlayerViewSchema).max(8),
  startedPlayerIds: z.array(playerIdSchema).max(8),
}).strict()

const privateViewerSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('display-host'), hostId: hostIdSchema }).strict(),
  z.object({ role: z.literal('player'), playerId: playerIdSchema }).strict(),
])

export const privateSessionViewSchema = z.object({
  visibility: z.literal('private'),
  roomId: roomIdSchema,
  roomCode: roomCodeSchema,
  phase: sessionPhaseSchema,
  revision: revisionSchema,
  selectedMode: gameModeSchema.nullable(),
  hostConnected: z.boolean(),
  minPlayers: z.literal(2),
  maxPlayers: z.literal(8),
  players: z.array(publicPlayerViewSchema).max(8),
  startedPlayerIds: z.array(playerIdSchema).max(8),
  viewer: privateViewerSchema,
  allowedActions: z.array(allowedActionSchema),
}).strict()

const issuedIdentitySchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('display-host'),
    hostId: hostIdSchema,
    reconnectToken: reconnectTokenSchema,
  }).strict(),
  z.object({
    role: z.literal('player'),
    playerId: playerIdSchema,
    reconnectToken: reconnectTokenSchema,
  }).strict(),
])

const serverErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1).max(256),
}).strict()

export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({
    version: z.literal(PROTOCOL_VERSION),
    type: z.literal('credentials.issued'),
    actionId: actionIdSchema,
    roomId: roomIdSchema,
    roomCode: roomCodeSchema,
    identity: issuedIdentitySchema,
  }).strict(),
  z.object({
    version: z.literal(PROTOCOL_VERSION),
    type: z.literal('action.accepted'),
    actionId: actionIdSchema,
    revision: revisionSchema,
    replayed: z.boolean(),
  }).strict(),
  z.object({
    version: z.literal(PROTOCOL_VERSION),
    type: z.literal('action.rejected'),
    actionId: actionIdSchema.optional(),
    revision: revisionSchema.optional(),
    error: serverErrorSchema,
  }).strict(),
  z.object({
    version: z.literal(PROTOCOL_VERSION),
    type: z.literal('session.snapshot'),
    session: z.union([publicSessionViewSchema, privateSessionViewSchema]),
  }).strict(),
])

export type ClientMessage = z.infer<typeof clientMessageSchema>
export type ServerMessage = z.infer<typeof serverMessageSchema>
export type PublicSessionView = z.infer<typeof publicSessionViewSchema>
export type PrivateSessionView = z.infer<typeof privateSessionViewSchema>
export type ProtocolErrorCode = z.infer<typeof errorCodeSchema>

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: readonly string[] }

function formatIssues(error: z.ZodError): readonly string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'message'
    return `${path}: ${issue.message}`
  })
}

export function validateClientMessage(value: unknown): ValidationResult<ClientMessage> {
  const result = clientMessageSchema.safeParse(value)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, issues: formatIssues(result.error) }
}

export function validateServerMessage(value: unknown): ValidationResult<ServerMessage> {
  const result = serverMessageSchema.safeParse(value)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, issues: formatIssues(result.error) }
}
