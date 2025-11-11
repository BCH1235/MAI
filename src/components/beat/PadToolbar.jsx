// src/components/beat/PadToolbar.jsx

import React from "react";
import { Button, ButtonGroup } from "@mui/material";
import { useBeatPad } from "../../state/beatPadStore";

const buttonStyles = {
  contained: {
    bgcolor: "#2DD4BF",
    color: "#0A0A0A",
    fontWeight: 600,
    "&:hover": { bgcolor: "#28bfa8" },
  },
  outlined: {
    borderColor: "#2DD4BF",
    color: "#2DD4BF",
    fontWeight: 600,
    "&:hover": {
      borderColor: "#2DD4BF",
      backgroundColor: "rgba(45, 212, 191, 0.1)",
    },
  },
};

export default function PadToolbar() {
  const { state, dispatch } = useBeatPad();

  const toggleDrawMode = () => {
    const nextMode = state.drawMode === "PATH" ? "DRAG" : "PATH";
    dispatch({ type: "SET_DRAW_MODE", payload: nextMode });
  };

  return (
    <ButtonGroup size="small" variant="outlined" sx={{ mb: 2 }}>
      <Button
        onClick={toggleDrawMode}
        variant={state.drawMode === "PATH" ? "contained" : "outlined"}
        sx={state.drawMode === "PATH" ? buttonStyles.contained : buttonStyles.outlined}
      >
        그리기 모드
      </Button>
    </ButtonGroup>
  );
}
