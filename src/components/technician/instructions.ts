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
    objective: "Donor vehicle 상태를 “복원 가능한 수준의 기준 데이터”로 고정.",
    prereqs: "Donor 입고 완료, 작업공간 확보",
    inputs: "VIN scanner/카메라/태그 프린터/기본 진단툴",
    steps: [
      "VIN 확인 및 사진 기록(대시/도어/엔진룸)",
      "엔진/미션 번호, ECU 라벨 촬영",
      "오도미터/계기판 상태 촬영",
      "하부 부식/충격 흔적 360° 촬영",
      "“Reuse / Rebuild / Scrap” 1차 분류 기준 체크",
      "Donor Buildbook 생성(디지털) + QR 라벨 출력"
    ],
    qualityGates: ["VIN/serial 증빙 사진 10장 이상", "Baseline report 생성됨"],
    logOnCompletion: ["Photos", "Notes(이상 징후)"]
  },
  {
    station: "Teardown",
    taskTitle: "Donor Parts Cataloging (nuts & bolts level)",
    objective: "분해되는 모든 파츠를 추적 가능한 SKU/서브SKU로 카탈로그화",
    inputs: "부품 트레이/라벨/저울(볼트류)/캘리퍼스/세척 전용박스",
    steps: [
      "Sub-assembly 단위로 분해 (ex: front suspension)",
      "각 트레이에 “donor build code + sub-assembly + date” 라벨",
      "Fasteners(볼트/너트/와셔)는 봉투 단위로 분류 후 수량 기록",
      "재사용 후보 파츠는 치수/마모 상태 기록",
      "리빌드 대상은 “Rebuild required” 태그 부착",
      "Scrap은 폐기 사유 기록"
    ],
    qualityGates: ["트레이/봉투 라벨 누락 0", "fastener count 기록 필수"],
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
      "엔진 리빌드가 빌드 타임라인의 병목이 되지 않게 “리드타임/부품/의사결정”을 고정",
    prereqs: "donor engine teardown 완료, rebuild scope 합의",
    inputs: "bearing kit / seals / machining vendor info / torque spec sheet",
    steps: [
      "Rebuild scope 확정(Stock / performance / displacement)",
      "Required kit 목록 확정(bearing/seal/gasket)",
      "Machining vendor 슬롯 예약/납기 확인",
      "Crank/case 측정치 기록(필수 항목만)",
      "Missing parts 발생 시 즉시 Block 사유 = “Awaiting parts/material”",
      "ETA 업데이트(“Expected back on” 날짜)"
    ],
    qualityGates: ["Vendor + ETA 확정됨", "Required parts list 확정됨"],
    logOnCompletion: ["Vendor name", "ETA", "Missing parts list"]
  },
  {
    station: "Carbon",
    taskTitle: "Carbon Panel Fitment Loop",
    objective: "패널 갭/정렬을 반복하면서 최종 조립 품질 기준 만족",
    prereqs: "chassis prep 완료, 패널 준비",
    inputs: "panel set, alignment shims, clamps, measuring tape, gap gauge",
    steps: [
      "패널 프리핏(임시 고정)",
      "좌/우 갭 측정 기록(목표 범위 체크)",
      "간섭 포인트 표시 및 수정",
      "수정 후 재측정",
      "mounting points 토크(임시 토크) 적용",
      "QC 호출(중간 승인)"
    ],
    qualityGates: ["gap tolerance within spec", "no visible warp / stress point"],
    logOnCompletion: ["gap measurements", "QC pass/fail"]
  },
  {
    station: "Paint",
    taskTitle: "Paint Prep — Mexico Blue",
    objective: "도장 품질을 위한 표면 상태/환경/재료 준비 완비",
    prereqs: "bodywork 완료, booth available",
    inputs: "primer, paint, booth filters, PPE, mixing sheet",
    steps: [
      "표면 결함 점검(손/조명)",
      "마스킹 라인 확인",
      "booth 환경 체크(온도/습도)",
      "paint mix batch 기록",
      "test spray 확인",
      "본 도장 진행",
      "cure time 시작 기록"
    ],
    qualityGates: ["mix batch 기록됨", "booth environment OK"],
    logOnCompletion: ["batch id", "booth conditions", "cure start time"]
  },
  {
    station: "Electrical",
    taskTitle: "Harness Routing & ECU Check",
    objective: "하네스 라우팅/커넥터 체결/ECU 기본 체크 완료",
    prereqs: "interior access 확보, harness kit 준비",
    inputs: "harness, ECU, multimeter, connector checklist",
    steps: [
      "하네스 라우팅 경로 확인",
      "클립/고정 포인트 체결",
      "커넥터 체결 체크(필수 리스트)",
      "전원/그라운드 continuity 체크",
      "ECU 초기 통신 확인"
    ],
    qualityGates: ["connector checklist 100%", "ECU handshake OK"],
    logOnCompletion: ["connector exceptions", "ECU status"]
  },
  {
    station: "QC",
    taskTitle: "Final QC Gate (pre-delivery)",
    objective: "출고 전 “GW 표준” 기준 통과",
    steps: [
      "Panel gaps final check",
      "Paint finish check",
      "Torque witness mark check",
      "Fluids & leak inspection",
      "Test drive checklist",
      "Sign-off"
    ],
    logOnCompletion: ["QC sign-off name", "exceptions"]
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
      objective: "작업 목표를 확인하고 안전/품질 기준에 맞게 수행하세요.",
      steps: [
        "작업 지시서 확인",
        "필요 부품/툴 준비",
        "작업 수행",
        "중간 점검",
        "마감 정리",
        "완료 기록"
      ],
      qualityGates: ["필수 체크 항목 완료"],
      logOnCompletion: ["사진/메모"]
    }
  );
}
