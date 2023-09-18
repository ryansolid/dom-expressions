import { Serializer } from "seroval";

export default function createSerializer(onData: (value: string) => void): Serializer;