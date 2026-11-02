"""
Probability calibration audit and analysis for Rainfall Shortfall Risk models.
Compares Raw, Sigmoid (Platt), and Isotonic calibration fitted strictly on validation data.
Evaluates on untouched test data (2020-2024).
"""

from pathlib import Path
from typing import Dict, Any, Tuple, List
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve, CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, log_loss

from ml.config import REPORTS_DIR


def compute_expected_calibration_error(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10
) -> float:
    """
    Computes Expected Calibration Error (ECE) across uniform bins.
    """
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        bin_mask = (y_prob >= bin_edges[i]) & (y_prob < bin_edges[i + 1])
        if i == n_bins - 1:
            bin_mask = (y_prob >= bin_edges[i]) & (y_prob <= bin_edges[i + 1])

        bin_count = np.sum(bin_mask)
        if bin_count > 0:
            bin_acc = np.mean(y_true[bin_mask])
            bin_conf = np.mean(y_prob[bin_mask])
            ece += (bin_count / n) * abs(bin_acc - bin_conf)

    return float(round(ece, 4))


def run_calibration_audit(
    base_model_lr: Any,
    base_model_rf: Any,
    X_val: pd.DataFrame,
    y_val: np.ndarray,
    X_test: pd.DataFrame,
    y_test: np.ndarray,
    output_plot_path: Path = REPORTS_DIR / "calibration_curve.png",
) -> Dict[str, Any]:
    """
    Fits Sigmoid and Isotonic calibrations strictly on X_val, y_val.
    Evaluates raw and calibrated models on untouched X_test, y_test.
    Plots reliability diagram and returns comparison metrics.
    """
    candidates = {}

    # Logistic Regression Variants
    p_lr_raw = base_model_lr.predict_proba(X_test)[:, 1]
    candidates["LR Raw"] = p_lr_raw

    frozen_lr = FrozenEstimator(base_model_lr)
    cal_lr_sig = CalibratedClassifierCV(frozen_lr, method="sigmoid")
    cal_lr_sig.fit(X_val, y_val)
    candidates["LR + Sigmoid (Val)"] = cal_lr_sig.predict_proba(X_test)[:, 1]

    cal_lr_iso = CalibratedClassifierCV(frozen_lr, method="isotonic")
    cal_lr_iso.fit(X_val, y_val)
    candidates["LR + Isotonic (Val)"] = cal_lr_iso.predict_proba(X_test)[:, 1]

    # Random Forest Variants
    p_rf_raw = base_model_rf.predict_proba(X_test)[:, 1]
    candidates["RF Raw"] = p_rf_raw

    frozen_rf = FrozenEstimator(base_model_rf)
    cal_rf_sig = CalibratedClassifierCV(frozen_rf, method="sigmoid")
    cal_rf_sig.fit(X_val, y_val)
    candidates["RF + Sigmoid (Val)"] = cal_rf_sig.predict_proba(X_test)[:, 1]

    cal_rf_iso = CalibratedClassifierCV(frozen_rf, method="isotonic")
    cal_rf_iso.fit(X_val, y_val)
    candidates["RF + Isotonic (Val)"] = cal_rf_iso.predict_proba(X_test)[:, 1]

    audit_metrics = {}
    fig, ax = plt.subplots(figsize=(8.5, 6.5), dpi=150)
    ax.plot([0, 1], [0, 1], "k--", label="Perfect Calibration (Ideal)", alpha=0.8, linewidth=1.5)

    colors = {
        "LR Raw": ("#1f77b4", "s-"),
        "LR + Sigmoid (Val)": ("#aec7e8", "^--"),
        "LR + Isotonic (Val)": ("#393b79", "v:"),
        "RF Raw": ("#2ca02c", "o-"),
        "RF + Sigmoid (Val)": ("#98df8a", "d--"),
        "RF + Isotonic (Val)": ("#1b9e77", "*:"),
    }

    for name, p_test in candidates.items():
        roc = float(round(roc_auc_score(y_test, p_test), 4))
        pr = float(round(average_precision_score(y_test, p_test), 4))
        brier = float(round(brier_score_loss(y_test, p_test), 4))
        logloss = float(round(log_loss(y_test, p_test), 4))
        ece = compute_expected_calibration_error(y_test, p_test)

        audit_metrics[name] = {
            "roc_auc": roc,
            "pr_auc": pr,
            "brier_score": brier,
            "log_loss": logloss,
            "ece": ece,
        }

        # Plot curve
        prob_true, prob_pred = calibration_curve(y_test, p_test, n_bins=10, strategy="uniform")
        color, style = colors.get(name, ("gray", ".-"))
        ax.plot(prob_pred, prob_true, style, color=color, label=f"{name} (Brier: {brier:.4f}, ECE: {ece:.4f})", alpha=0.9)

    ax.set_xlabel("Mean Predicted Probability", fontsize=11)
    ax.set_ylabel("Observed Fraction of Shortfalls (y = 1)", fontsize=11)
    ax.set_title("Reliability Diagram: Calibration Audit on Held-Out Test Set (2020-2024)", fontsize=12, fontweight="bold")
    ax.legend(loc="upper left", fontsize=8.5, frameon=True)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)

    plt.tight_layout()
    fig.savefig(output_plot_path)
    plt.close(fig)
    print(f"Saved calibration audit curves to {output_plot_path}")

    return audit_metrics
