import type { Catalog } from "@a2ui-sdk/react/0.8";
import { standardCatalog } from "@a2ui-sdk/react/0.8";
import { MultipleChoiceMeowOne } from "./MultipleChoiceMeowOne";
import { TextFieldMeowOne } from "./TextFieldMeowOne";
import { CheckBoxMeowOne } from "./CheckBoxMeowOne";

/** 标准目录 + MeowOne 增强（字面量绑定的表单可编辑、选择即回传 action） */
export const meowoneCatalog: Catalog = {
  ...standardCatalog,
  components: {
    ...standardCatalog.components,
    MultipleChoice: MultipleChoiceMeowOne,
    TextField: TextFieldMeowOne,
    CheckBox: CheckBoxMeowOne,
  },
};
