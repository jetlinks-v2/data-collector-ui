export const symbolList = [
    {
      key: "add",
      value: "+",
    },
    {
      key: "subtract",
      value: "-",
    },
    {
      key: "multiply",
      value: "*",
    },
    {
      key: "divide",
      value: "/",
    },
    {
      key: "parentheses",
      value: "()",
    },
    {
      key: "cubic",
      value: "^",
    },
    {
      key: "dayu",
      value: ">",
    },
    {
      key: "dayudengyu",
      value: ">=",
    },
    {
      key: "dengyudengyu",
      value: "==",
    },
    {
      key: "xiaoyudengyu",
      value: "<=",
    },
    {
      key: "xiaoyu",
      value: "<",
    },
    {
      key: "jiankuohao",
      value: "<>",
    },
    {
      key: "andand",
      value: "&&",
    },
    {
      key: "huohuo",
      value: "||",
    },
    {
      key: "fei",
      value: "!",
    },
    {
      key: "and",
      value: "&",
    },
    {
      key: "huo",
      value: "|",
    },
    {
      key: "bolang",
      value: "~",
    },
  ];

export const dataType =  [
    {
      "id": "Number",
      "name": "数值类型",
      "description": "数值类型",
      "children": [
        {
          "id": "Number",
          "name": "数值类型",
          "description": "数值类型"
        },
        {
          "id": "Byte",
          "name": "字节",
          "description": "加"
        },
        {
          "id": "Short",
          "name": "短整型",
          "description": "短整型"
        },
        {
          "id": "UShort",
          "name": "16位无符号整型",
          "description": "16位无符号整型"
        },
        {
          "id": "Integer",
          "name": "整型",
          "description": "整型"
        },
        {
          "id": "DINT",
          "name": "32位有符号双整型",
          "description": "32位有符号双整型"
        },
        {
          "id": "Long",
          "name": "长整型",
          "description": "长整型"
        },
        {
          "id": "LLong",
          "name": "长整型",
          "description": "长整型"
        },
        {
          "id": "Float",
          "name": "浮点型",
          "description": "浮点型"
        },
        {
          "id": "Double",
          "name": "双精度浮点型",
          "description": "双精度浮点型"
        },
        {
          "id": "int",
          "name": "整型",
          "description": "整型"
        },
        {
          "id": "int8",
          "name": "整型",
          "description": "整型"
        },
        {
          "id": "int16",
          "name": "整型",
          "description": "整型"
        },
        {
          "id": "int32",
          "name": "整型",
          "description": "整型"
        },
        {
          "id": "int64",
          "name": "整型",
          "description": "整型"
        },
        {
          "id": "ieee754_float",
          "name": "浮点",
          "description": "浮点"
        },
        {
          "id": "ieee754_double",
          "name": "浮点",
          "description": "浮点"
        },
        {
          "id": "Real",
          "name": "浮点",
          "description": "浮点"
        },
        {
          "id": "LREAL",
          "name": "浮点",
          "description": "浮点"
        },
        {
          "id": "Unsigned8",
          "name": "数值",
          "description": "数值"
        },
        {
          "id": "Unsigned16",
          "name": "数值",
          "description": "数值"
        },
        {
          "id": "Unsigned32",
          "name": "数值",
          "description": "数值"
        },
        {
          "id": "UnsignedInteger",
          "name": "数值",
          "description": "数值"
        },
        {
          "id": "LINT",
          "name": "64位有符号整型",
          "description": "64位有符号整型"
        },
        {
          "id": "WORD",
          "name": "16位有符号整型",
          "description": "16位有符号整型"
        },
        {
          "id": "SINT",
          "name": "8位整型",
          "description": "8位整型"
        },
        {
          "id": "USINT",
          "name": "8位整型",
          "description": "8位整型"
        },
        {
          "id": "UINT",
          "name": "16位整型",
          "description": "16位整型"
        },
        {
          "id": "UDINT",
          "name": "32位有符号双整型",
          "description": "32位有符号双整型"
        },
        {
          "id": "ULINT",
          "name": "64位无符号长整型",
          "description": "64位无符号长整型"
        },
        {
          "id": "DWord",
          "name": "32位整数",
          "description": "32位整数"
        }
      ],
      "operator": [
        {
          "name": "等于",
          "value": "eq"
        },
        {
          "name": "不等于",
          "value": "neq"
        },
        {
          "name": "大于",
          "value": "gt"
        },
        {
          "name": "小于",
          "value": "lt"
        },
        {
          "name": "大于等于",
          "value": "gte"
        },
        {
          "name": "小于等于",
          "value": "lte"
        },
        {
          "name": "在...之间",
          "value": "btw"
        },
        {
          "name": "不在...之间",
          "value": "nbtw"
        },
        {
          "name": "在...之中",
          "value": "in"
        },
        {
          "name": "不在...之中",
          "value": "nin"
        }
      ]
    },
    {
      "id": "DateTime",
      "name": "时间",
      "code": "",
      "description": "",
      "children": [
        {
          "id": "DateTime",
          "name": "时间类型",
          "description": ""
        },
        {
          "id": "Date",
          "name": "时间类型",
          "description": ""
        }
      ],
      "operator": [
        {
          "name": "等于",
          "value": "eq"
        },
        {
          "name": "不等于",
          "value": "neq"
        },
        {
          "name": "大于",
          "value": "gt"
        },
        {
          "name": "小于",
          "value": "lt"
        },
        {
          "name": "大于等于",
          "value": "gte"
        },
        {
          "name": "小于等于",
          "value": "lte"
        },
        {
          "name": "在...之间",
          "value": "btw"
        },
        {
          "name": "不在...之间",
          "value": "nbtw"
        },
        {
          "name": "在...之中",
          "value": "in"
        },
        {
          "name": "不在...之中",
          "value": "nin"
        }
      ]
    },
    {
      "id": "Time",
      "name": "时间",
      "code": "",
      "description": "",
      "children": [
        {
          "id": "Time",
          "name": "时间类型",
          "description": ""
        }
      ],
      "operator": [
        {
          "name": "等于",
          "value": "eq"
        },
        {
          "name": "不等于",
          "value": "neq"
        },
        {
          "name": "大于",
          "value": "gt"
        },
        {
          "name": "小于",
          "value": "lt"
        },
        {
          "name": "大于等于",
          "value": "gte"
        },
        {
          "name": "小于等于",
          "value": "lte"
        },
        {
          "name": "在...之间",
          "value": "btw"
        },
        {
          "name": "不在...之间",
          "value": "nbtw"
        },
        {
          "name": "在...之中",
          "value": "in"
        },
        {
          "name": "不在...之中",
          "value": "nin"
        }
      ]
    },
    {
      "id": "Boolean",
      "name": "布尔",
      "code": "",
      "description": "",
      "children": [
        {
          "id": "Boolean",
          "name": "布尔",
          "description": ""
        },
        {
          "id": "BOOL",
          "name": "布尔",
          "description": ""
        }
      ],
      "operator":[
        {
          "name": "等于",
          "value": "eq"
        }
      ]
    },
    {
      "id": "String",
      "name": "文本类型",
      "code": "",
      "description": "",
      "children": [
        {
          "id": "String",
          "name": "字符串",
          "description": ""
        },
        {
          "id": "hex",
          "name": "文本",
          "description": ""
        },
        {
          "id": "Enumerated",
          "name": "字符串",
          "description": "字符串"
        },
        {
          "id": "BinaryPV",
          "name": "字符串",
          "description": "字符串"
        },
        {
          "id": "CharacterString",
          "name": "字符串",
          "description": "字符串"
        },
        {
          "id": "SHORT_STRING",
          "name": "字符串",
          "description": "字符串"
        }
      ],
      "operator":[
        {
          "name": "等于",
          "value": "eq"
        }
      ]
    },
    {
      "id": "Array",
      "name": "数组类型",
      "code": "",
      "description": "",
      "children": [
        {
          "id": "Array",
          "name": "字符串",
          "description": ""
        }
      ],
      "operator":[
        {
          "name": "包含",
          "value": "like"
        },
        {
          "name": "不包含",
          "value": "nlike"
        }
      ]
    }
  ]