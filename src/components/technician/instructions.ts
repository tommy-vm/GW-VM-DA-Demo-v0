export type InstructionTemplate = {
  station: string;
  taskTitle: string;
  objective: string;
  prereqs?: string;
  inputs?: string;
  steps: string[];
  qualityGates?: string[];
  logOnCompletion?: string[];
};

const templates: InstructionTemplate[] = [
  {
    station: "Teardown",
    taskTitle: "Donor Intake & VIN / Condition Baseline",
    objective:
      "Lock baseline data so the donor vehicle condition is documented for rebuild quality.",
    prereqs: "Donor check-in complete, workspace prepared",
    inputs: "VIN scanner / camera / tag printer / basic diagnostic tools",
    steps: [
      "Verify VIN and capture photos (dash/door/engine bay)",
      "Photograph engine/transmission numbers and ECU labels",
      "Capture odometer and instrument cluster condition",
      "Capture 360° underbody corrosion/impact evidence",
      "Check initial “Reuse / Rebuild / Scrap” classification",
      "Create digital donor buildbook + print QR labels"
    ],
    qualityGates: ["10+ VIN/serial evidence photos", "Baseline report created"],
    logOnCompletion: ["Photos", "Notes (anomalies)"]
  },
  {
    station: "Teardown",
    taskTitle: "Donor Parts Cataloging (nuts & bolts level)",
    objective:
      "Catalog every disassembled part as trackable SKU/sub-SKU entries.",
    inputs:
      "Part trays / labels / scale (fasteners) / calipers / wash boxes",
    steps: [
      "Disassemble by sub-assembly (e.g., front suspension)",
      "Label each tray with “donor build code + sub-assembly + date”",
      "Bag fasteners and record counts per bag",
      "Record dimensions/wear for reuse candidates",
      "Tag rebuild candidates with “Rebuild required”",
      "Record scrap reason for discarded parts"
    ],
    qualityGates: ["Zero missing tray/bag labels", "Fastener counts recorded"],
    logOnCompletion: [
      "Parts count",
      "Measurements (optional)",
      "Reuse/Rebuild/Scrap decision"
    ]
  },
  {
    station: "Powertrain",
    taskTitle: "Engine Rebuild Coordination (Vendor + internal workflow)",
    objective:
      "Lock lead time, parts, and decisions so engine rebuild is not the build bottleneck.",
    prereqs: "Donor engine teardown complete, rebuild scope agreed",
    inputs:
      "bearing kit / seals / machining vendor info / torque spec sheet",
    steps: [
      "Confirm rebuild scope (stock / performance / displacement)",
      "Confirm required kit list (bearing/seal/gasket)",
      "Reserve machining vendor slot and confirm due date",
      "Record crank/case measurements (critical fields only)",
      "If missing parts, Block with reason “Awaiting parts/material”",
      "Update ETA (Expected back on date)"
    ],
    qualityGates: ["Vendor + ETA confirmed", "Required parts list confirmed"],
    logOnCompletion: ["Vendor name", "ETA", "Missing parts list"]
  },
  {
    station: "Carbon",
    taskTitle: "Carbon Panel Fitment Loop",
    objective: "Iterate panel gaps and alignment to meet final assembly quality.",
    prereqs: "Chassis prep complete, panels ready",
    inputs: "panel set / alignment shims / clamps / measuring tape / gap gauge",
    steps: [
      "Pre-fit panels (temporary mounting)",
      "Measure left/right gaps (verify target range)",
      "Mark interference points and adjust",
      "Re-measure after adjustment",
      "Apply temporary torque to mounting points",
      "Call QC for interim approval"
    ],
    qualityGates: [
      "Gap tolerance within spec",
      "No visible warp or stress points"
    ],
    logOnCompletion: ["gap measurements", "QC pass/fail"]
  },
  {
    station: "Paint",
    taskTitle: "Paint Prep — Mexico Blue",
    objective:
      "Complete surface, environment, and material readiness for paint quality.",
    prereqs: "Bodywork complete, booth available",
    inputs: "primer / paint / booth filters / PPE / mixing sheet",
    steps: [
      "Inspect surface defects (hand/lighting)",
      "Verify masking lines",
      "Check booth environment (temperature/humidity)",
      "Record paint mix batch",
      "Verify test spray",
      "Proceed with full paint",
      "Record cure start time"
    ],
    qualityGates: ["Mix batch recorded", "Booth environment OK"],
    logOnCompletion: ["Batch ID", "Booth conditions", "Cure start time"]
  },
  {
    station: "Electrical",
    taskTitle: "Harness Routing & ECU Check",
    objective: "Complete harness routing, connector checks, and ECU baseline.",
    prereqs: "Interior access cleared, harness kit ready",
    inputs: "harness / ECU / multimeter / connector checklist",
    steps: [
      "Verify harness routing path",
      "Secure clips and mounting points",
      "Check connectors against required list",
      "Verify power/ground continuity",
      "Confirm ECU initial communication"
    ],
    qualityGates: ["Connector checklist 100%", "ECU handshake OK"],
    logOnCompletion: ["Connector exceptions", "ECU status"]
  },
  {
    station: "QC",
    taskTitle: "Final QC Gate (pre-delivery)",
    objective: "Pass GW standards prior to delivery.",
    steps: [
      "Panel gaps final check",
      "Paint finish check",
      "Torque witness mark check",
      "Fluids & leak inspection",
      "Test drive checklist",
      "Sign-off"
    ],
    logOnCompletion: ["QC sign-off name", "Exceptions"]
  }
];

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function matchTemplate(taskTitle?: string | null, phase?: string | null) {
  const title = normalize(taskTitle);
  const phaseValue = normalize(phase);
  return templates.find(
    (template) =>
      normalize(template.taskTitle) === title ||
      normalize(template.station) === phaseValue
  );
}

export function getInstructionTemplate(
  taskTitle?: string | null,
  phase?: string | null
): InstructionTemplate {
  return (
    matchTemplate(taskTitle, phase) ?? {
      station: phase ?? "General",
      taskTitle: taskTitle ?? "Work Instruction",
      objective:
        "Confirm the objective and execute to safety and quality standards.",
      steps: [
        "Review work instructions",
        "Prepare required parts/tools",
        "Execute task",
        "Perform mid-check",
        "Finalize cleanup",
        "Log completion"
      ],
      qualityGates: ["Required checks completed"],
      logOnCompletion: ["Photos/notes"]
    }
  );
}
