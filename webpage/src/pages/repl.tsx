import {useState} from 'react';
import {CSSProperties} from 'react';
import {Button} from '@mui/material';
import {ButtonGroup} from "@mui/material";

import Bluetooth, {CHARACTERISTIC_IDS} from '../services/bluetooth';
import * as network from "../services/network"
import BSCodeEditorCell from "../components/code-editor-cell";
import BSCodeEditorCellDisabled from "../components/code-editor-cell-disabled";
import {Buffer} from "buffer";
import Grid2 from "@mui/material/Unstable_Grid2";
import BSLogArea from "../components/log-area";
import { CompileError } from '../utils/error';


const bluetooth = new Bluetooth();

export default function Repl() {
  // msgLen: the length of GATT connection data in bytes
  const [msgLen, setMsgLen] = useState("100")
  const [exitedCodes, setExitedCodes] = useState<string[]>([]);
  const [log, setLog] = useState("");
  const [compileError, setCompileError] = useState("");
  let logString = "";

  let count = 0

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const exitCode = async () => {
    console.log("execute pushed", performance.now())
    setCompileError("");

    try {
      {
        let bufferLen = Number(msgLen) * 2
        let buffer = ""
        for (let i = 0; i < bufferLen; i++) {
          buffer += "1" // one character representing 4 bits (0.5 Byte)
        }

        console.log("Tranfering size: " + Number(msgLen));
        for (let i = 0; i < 10; i++) {
          await bluetooth.sendMachineCode(CHARACTERISTIC_IDS.REPL, buffer);
          console.log(i)
          // set 2 s as the interval between connection
          await sleep(2000);
        }

        // disconnect the ble
        bluetooth.finish();
      }
    } catch (error: any) {
      if (error instanceof CompileError) {
        setCompileError(error.toString());
      } else {
        console.log(error);
        window.alert(`Failed to compile: ${error.message}`);
      }
    }
  }

  const onClearPushed = async () => {
    try {
      await Promise.all([
        network.clear(),
        bluetooth.sendMachineCode(CHARACTERISTIC_IDS.CLEAR, "")
      ]);
      setExitedCodes([]);
      setMsgLen("");
      setLog("");
      setCompileError("");
    } catch (error: any) {
      console.log(error);
      window.alert(`Failed to compile: ${error.message}`);
    }
  }

  const onLogSent = (event: Event) => {
    // @ts-ignore
    logString += Buffer.from(event.target.value.buffer).toString();
    // @ts-ignore
    console.log("receive log", performance.now());
    setLog(logString);
  }

  return (
    <div style={{marginTop: 100, paddingLeft: 100, paddingRight: 100, paddingBottom: 100}}>
      <Grid2 container spacing={3}>
        <Grid2 style={{height: 50, textAlign: "end"}} xs={12}>
          <ButtonGroup variant="contained" color={"success"}>
            <Button onClick={onClearPushed}>Clear</Button>
            <Button onClick={() => bluetooth.startNotifications(onLogSent)}>Start</Button>
            <Button onClick={() => bluetooth.stopLogNotification()}>Stop</Button>
          </ButtonGroup>
        </Grid2>
        <Grid2 xs={7}>
          {exitedCodes.map((exitedCode, index) => {
            return <BSCodeEditorCellDisabled code={exitedCode} key={index}/>
          })}
          <BSCodeEditorCell code={msgLen} exitCode={exitCode} setCode={setMsgLen}/>
          <div style={style.compileErrorBox}>{compileError}</div>
        </Grid2>
        <Grid2 xs={5}>
          <BSLogArea log={log} />
        </Grid2>
      </Grid2>
    </div>
  );
}


const style: { [key: string]: CSSProperties } = {
  compileErrorBox: {
    color: "red",
    paddingLeft: 10,
    whiteSpace: "pre-wrap",
    lineHeight: "150%"
  }
}