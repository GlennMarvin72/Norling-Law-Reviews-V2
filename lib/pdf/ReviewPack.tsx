import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Inter, per the brand guidelines. Falls back to Helvetica if the fetch fails at build.
try {
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.ttf", fontWeight: 400 },
      { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.ttf", fontWeight: 600 },
    ],
  });
} catch {}

const GOLD = "#ECB034";
const STONE = "#C5B9AC";
const GREY = "#63666A";

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9.5, padding: 40, color: "#000", lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  logo: { fontSize: 16, fontWeight: 600 },
  logoDot: { color: GOLD },
  headerRight: { fontSize: 8, color: GREY, textTransform: "uppercase", letterSpacing: 1 },
  goldRule: { height: 3, backgroundColor: GOLD, marginBottom: 18 },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 2 },
  subtitle: { fontSize: 10, color: GREY, marginBottom: 16 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 18 },
  metaItem: { minWidth: 110 },
  metaLabel: { fontSize: 7, color: GREY, textTransform: "uppercase", letterSpacing: 0.8 },
  metaValue: { fontSize: 10, fontWeight: 600 },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, marginTop: 14, marginBottom: 8,
    paddingBottom: 3, borderBottomWidth: 2, borderBottomColor: GOLD,
  },
  qBlock: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: STONE },
  qLabel: { fontSize: 10.5, fontWeight: 600, marginBottom: 2 },
  qHelp: { fontSize: 8, color: GREY, marginBottom: 5 },
  ratingRow: { flexDirection: "row", gap: 10, marginBottom: 5 },
  ratingBadge: { fontSize: 8, backgroundColor: "#EFEBE4", paddingHorizontal: 6, paddingVertical: 2 },
  ratingBadgeSet: { fontSize: 8, backgroundColor: GOLD, paddingHorizontal: 6, paddingVertical: 2, fontWeight: 600 },
  fieldLabel: { fontSize: 7.5, color: GREY, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 4 },
  fieldText: { fontSize: 9.5 },
  writeSpace: { height: 40, borderWidth: 0.5, borderColor: STONE, marginTop: 3 },
  perfGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, backgroundColor: "#EFEBE4", padding: 12, marginBottom: 6 },
  compBox: { borderWidth: 1.5, borderColor: "#000", padding: 12, marginTop: 10 },
  compTitle: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
  compWarn: { fontSize: 7.5, color: GREY, marginBottom: 8 },
  actionRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: STONE, paddingVertical: 4 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: GREY, flexDirection: "row", justifyContent: "space-between" },
});

const rating = (v?: string | null) =>
  v ? v.charAt(0) + v.slice(1).toLowerCase() : null;

const money = (n?: number | null) =>
  n == null ? "-" : "$" + n.toLocaleString("en-NZ", { maximumFractionDigits: 0 });

function Ratings({ self, director }: { self?: string | null; director?: string | null }) {
  return (
    <View style={s.ratingRow}>
      <Text style={self ? s.ratingBadgeSet : s.ratingBadge}>
        Self: {rating(self) ?? "Not rated"}
      </Text>
      <Text style={director ? s.ratingBadgeSet : s.ratingBadge}>
        Director: {rating(director) ?? "____________"}
      </Text>
    </View>
  );
}

export function ReviewPackPdf({ pack, includeComp }: { pack: any; includeComp: boolean }) {
  const { cycle, sections, perf } = pack;
  const answerFor = (qid: string) => cycle.answers.find((a: any) => a.questionId === qid) ?? {};
  const reviewDate = new Date(cycle.reviewDate).toLocaleDateString("en-NZ", {
    day: "numeric", month: "long", year: "numeric",
  });
  const billableVariance =
    perf.billableTarget && perf.billableActual != null
      ? (((perf.billableActual - perf.billableTarget) / perf.billableTarget) * 100).toFixed(1) + "%"
      : "-";
  const ros = perf.salary && perf.revenueActual != null ? (perf.revenueActual / perf.salary).toFixed(2) + "x" : "-";
  const actions: any[] = (cycle.agreedActions as any[]) ?? [];

  return (
    <Document title={`Annual Review - ${cycle.user.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.logo}>
            norling law<Text style={s.logoDot}>.</Text>
          </Text>
          <Text style={s.headerRight}>Annual Performance Review - Confidential</Text>
        </View>
        <View style={s.goldRule} fixed />

        <Text style={s.title}>{cycle.user.name}</Text>
        <Text style={s.subtitle}>{cycle.user.position ?? ""}</Text>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Review date</Text>
            <Text style={s.metaValue}>{reviewDate}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Period reviewed</Text>
            <Text style={s.metaValue}>{perf.dataPeriod ?? "-"}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Self-assessment</Text>
            <Text style={s.metaValue}>
              {cycle.status === "SUBMITTED" || cycle.status === "COMPLETED" ? "Received" : "Not yet submitted"}
            </Text>
          </View>
        </View>

        {(perf.billableTarget != null || perf.revenueActual != null) && (
          <View style={s.perfGrid}>
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Billable hours</Text>
              <Text style={s.metaValue}>
                {perf.billableActual ?? "-"}{perf.billableTarget ? ` / ${perf.billableTarget}` : ""}
              </Text>
              <Text style={{ fontSize: 8, color: GREY }}>Variance {billableVariance}</Text>
            </View>
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Revenue delivered</Text>
              <Text style={s.metaValue}>{money(perf.revenueActual)}</Text>
              <Text style={{ fontSize: 8, color: GREY }}>
                {perf.revenueTarget ? `Target ${money(perf.revenueTarget)}` : ""}
              </Text>
            </View>
            {includeComp && (
              <>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Salary</Text>
                  <Text style={s.metaValue}>{money(perf.salary)}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Return on salary</Text>
                  <Text style={s.metaValue}>{ros}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {sections.map((section: any) => (
          <View key={section.id}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.questions.map((q: any) => {
              const a = answerFor(q.id);
              return (
                <View key={q.id} style={s.qBlock} wrap={false}>
                  <Text style={s.qLabel}>{q.label}</Text>
                  {q.helpText && <Text style={s.qHelp}>{q.helpText}</Text>}
                  {q.type === "VALUE" && <Ratings self={a.selfRating} director={a.directorRating} />}
                  <Text style={s.fieldLabel}>Their reflection</Text>
                  <Text style={s.fieldText}>{a.selfText || "No reflection provided."}</Text>
                  {a.selfFocus ? (
                    <>
                      <Text style={s.fieldLabel}>Their focus area</Text>
                      <Text style={s.fieldText}>{a.selfFocus}</Text>
                    </>
                  ) : null}
                  <Text style={s.fieldLabel}>Director notes / discussion</Text>
                  {a.directorNotes ? (
                    <Text style={s.fieldText}>{a.directorNotes}</Text>
                  ) : (
                    <View style={{ ...s.writeSpace, height: 80 }} />
                  )}
                  {q.type === "VALUE" && (
                    <>
                      <Text style={s.fieldLabel}>Agreed focus for next period</Text>
                      {a.agreedFocus ? (
                        <Text style={s.fieldText}>{a.agreedFocus}</Text>
                      ) : (
                        <View style={{ ...s.writeSpace, height: 26 }} />
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <Text style={s.sectionTitle}>Agreed actions & commitments</Text>
        {actions.length > 0 ? (
          actions.map((a, i) => (
            <View key={i} style={s.actionRow}>
              <Text style={{ flex: 3 }}>{a.action}</Text>
              <Text style={{ flex: 1, color: GREY }}>{a.owner}</Text>
              <Text style={{ flex: 1, color: GREY }}>{a.byWhen}</Text>
            </View>
          ))
        ) : (
          <>
            <View style={s.writeSpace} />
            <View style={s.writeSpace} />
          </>
        )}

        {includeComp && (
          <View style={s.compBox} wrap={false}>
            <Text style={s.compTitle}>Compensation review</Text>
            <Text style={s.compWarn}>Director only - not shared with employee.</Text>
            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Current salary</Text>
                <Text style={s.metaValue}>{money(perf.salary)}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Revenue this period</Text>
                <Text style={s.metaValue}>{money(perf.revenueActual)}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Recommendation</Text>
                <Text style={s.metaValue}>
                  {cycle.recommendation
                    ? cycle.recommendation.replace(/_/g, " ").toLowerCase()
                    : "____________"}
                  {cycle.increaseAmount ? ` (${money(cycle.increaseAmount)})` : ""}
                </Text>
              </View>
            </View>
            <Text style={s.fieldLabel}>Rationale</Text>
            {cycle.compRationale ? <Text style={s.fieldText}>{cycle.compRationale}</Text> : <View style={s.writeSpace} />}
            <Text style={s.fieldLabel}>Overall value assessment</Text>
            {cycle.compNotes ? <Text style={s.fieldText}>{cycle.compNotes}</Text> : <View style={s.writeSpace} />}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>norlinglaw.co.nz</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
