[**@dbzdrums/notation**](../index.md)

---

# Variable: standardDrumKit

```ts
const standardDrumKit: DrumKit<{
  bassDrum: {
    articulations: {
      normal: {
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "normal";
      octave: 4;
      stem: "up";
      step: "F";
    };
    midiUnpitched: 36;
    name: "Bass Drum";
    order: 0;
  };
  crash: {
    articulations: {
      normal: {
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "x";
      octave: 5;
      stem: "up";
      step: "A";
    };
    midiUnpitched: 49;
    name: "Crash Cymbal";
    order: 7;
  };
  floorTom: {
    articulations: {
      normal: {
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "normal";
      octave: 4;
      stem: "up";
      step: "A";
    };
    midiUnpitched: 41;
    name: "Floor Tom";
    order: 1;
  };
  hiHat: {
    articulations: {
      closed: {
        render: "base";
        role: "primary";
      };
      open: {
        display: {
          notehead: "circle-x";
        };
        render: "base";
        role: "primary";
      };
      pedal: {
        display: {
          notehead: "x";
          octave: 4;
          step: "D";
        };
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["closed"];
    display: {
      notehead: "x";
      octave: 5;
      stem: "up";
      step: "G";
    };
    midiUnpitched: 42;
    name: "Hi-Hat";
    order: 6;
  };
  ride: {
    articulations: {
      normal: {
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "x";
      octave: 5;
      stem: "up";
      step: "F";
    };
    midiUnpitched: 51;
    name: "Ride Cymbal";
    order: 5;
  };
  snare: {
    articulations: {
      flam: {
        graceDisplay: {
          notehead: "normal";
        };
        render: "grace";
        role: "primary";
      };
      normal: {
        render: "base";
        role: "primary";
      };
      rim: {
        display: {
          notehead: "x";
        };
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "normal";
      octave: 5;
      stem: "up";
      step: "C";
    };
    midiUnpitched: 38;
    name: "Snare Drum";
    order: 2;
  };
  tom1: {
    articulations: {
      normal: {
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "normal";
      octave: 5;
      stem: "up";
      step: "E";
    };
    midiUnpitched: 50;
    name: "High Tom";
    order: 4;
  };
  tom2: {
    articulations: {
      normal: {
        render: "base";
        role: "primary";
      };
    };
    defaultArticulations: readonly ["normal"];
    display: {
      notehead: "normal";
      octave: 5;
      stem: "up";
      step: "D";
    };
    midiUnpitched: 47;
    name: "Mid Tom";
    order: 3;
  };
}>;
```

Built-in immutable drum kit used when [BarDefinition.kit](../interfaces/BarDefinition.md#kit) is omitted.

It defines `bassDrum`, `floorTom`, `snare`, `tom2`, `tom1`, `ride`, `hiHat`,
and `crash`. Snare supports `normal`, `rim`, and `flam`; hi-hat supports
`closed`, `open`, and `pedal`; every other voice supports `normal`.
