/** 随聊天请求发送的附件（Base64，不含 data URL 前缀） */
export interface OutgoingAttachment {
  name: string;
  mime: string;
  data: string;
}
