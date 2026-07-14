export type Clock = () => Date;

export const now: Clock = () => new Date();
