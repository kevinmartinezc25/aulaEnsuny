declare module 'react-quill' {
  import React from 'react';
  export interface ReactQuillProps {
    value?: string;
    defaultValue?: string;
    readOnly?: boolean;
    theme?: string;
    modules?: any;
    formats?: string[];
    bounds?: string | HTMLElement;
    placeholder?: string;
    preserveWhitespace?: boolean;
    onChange?: (content: string, delta: any, source: any, editor: any) => void;
    onChangeSelection?: (selection: any, source: any, editor: any) => void;
    onFocus?: (selection: any, source: any, editor: any) => void;
    onBlur?: (previousSelection: any, source: any, editor: any) => void;
    onKeyDown?: React.EventHandler<any>;
    onKeyPress?: React.EventHandler<any>;
    onKeyUp?: React.EventHandler<any>;
    style?: React.CSSProperties;
    className?: string;
    tabIndex?: number;
    id?: string;
  }
  export default class ReactQuill extends React.Component<ReactQuillProps> {}
}
