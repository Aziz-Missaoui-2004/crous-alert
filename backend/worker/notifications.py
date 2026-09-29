"""Envoi des notifications du worker vers les utilisateurs concernés."""

from __future__ import annotations

import html
import logging
import os
import smtplib
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

logger = logging.getLogger(__name__)


class NotificationError(RuntimeError):
    """Erreur d'envoi d'une notification."""


@dataclass(frozen=True)
class NotificationListing:
    residence: str
    city: str
    postal_code: str | None
    housing_type: str
    price_min_cents: int | None
    price_max_cents: int | None
    surface_m2: float | None
    url: str
    last_seen_at: str


@dataclass(frozen=True)
class PendingNotification:
    alert_id: str
    recipient: str
    first_name: str
    listing: NotificationListing
    attempts: int


class NotificationMailer:
    def __init__(self, sender: str, password: str, host: str = "smtp.gmail.com", port: int = 465, timeout: int = 20) -> None:
        self.sender = sender
        self.password = password
        self.host = host
        self.port = port
        self.timeout = timeout

    @classmethod
    def from_environment(cls) -> "NotificationMailer":
        sender = os.getenv("EMAIL_SENDER", "crous.alerte.sender@gmail.com").strip()
        password = os.getenv("EMAIL_PASSWORD", "").strip()
        if not password:
            raise NotificationError("EMAIL_PASSWORD est requis pour envoyer les notifications.")
        return cls(sender, password, os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "465")), int(os.getenv("SMTP_TIMEOUT", "20")))

    def send(self, recipient: str, listings: list[NotificationListing]) -> None:
        if not listings:
            return
        message = MIMEMultipart("alternative")
        message["Subject"] = f"CROUS Alert — {len(listings)} nouveau(x) logement(s)"
        message["From"] = formataddr(("CROUS Alert", self.sender))
        message["To"] = recipient
        message.attach(MIMEText(_build_text(listings), "plain", "utf-8"))
        message.attach(MIMEText(_build_html(listings), "html", "utf-8"))
        try:
            with smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout) as server:
                server.login(self.sender, self.password)
                server.sendmail(self.sender, [recipient], message.as_string())
        except (smtplib.SMTPException, OSError) as exc:
            raise NotificationError(f"Envoi impossible vers {recipient} : {exc}") from exc
        logger.info("Notification envoyée à %s (%d logement(s))", recipient, len(listings))


def _price(minimum: int | None, maximum: int | None) -> str:
    if minimum is None and maximum is None:
        return "Prix non précisé"
    if maximum is None or minimum == maximum:
        return f"{(minimum or maximum or 0) / 100:.2f} €".replace(".", ",")
    if minimum is None:
        return f"Jusqu'à {maximum / 100:.2f} €".replace(".", ",")
    return f"{minimum / 100:.2f} à {maximum / 100:.2f} €".replace(".", ",")


def _details(item: NotificationListing) -> str:
    values = ["Chambre" if item.housing_type == "chambre" else "Studio", _price(item.price_min_cents, item.price_max_cents)]
    if item.surface_m2 is not None:
        values.append(f"{item.surface_m2:g} m²")
    return " · ".join(values)


def _date_label(value: str) -> str:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone().strftime("%d/%m/%Y à %H:%M")
    except ValueError:
        return value


def _build_text(listings: list[NotificationListing]) -> str:
    lines = ["Nouveaux logements CROUS correspondant à votre surveillance", "", f"{len(listings)} logement(s) détecté(s) :", ""]
    for item in listings:
        location = f"{item.city}{f' · {item.postal_code}' if item.postal_code else ''}"
        lines.extend([f"- {item.residence}", f"  {location}", f"  {_details(item)}", f"  Vu le : {_date_label(item.last_seen_at)}", f"  Voir l'annonce : {item.url}", ""])
    lines.extend(["Cette alerte est générée automatiquement par Crous Alert.", "Crous Alert n'est pas affilié au CROUS."])
    return "\n".join(lines)


def _build_html(listings: list[NotificationListing]) -> str:
    template_path = Path(__file__).resolve().parents[2] / "email_template.html"
    template = template_path.read_text(encoding="utf-8")
    cards = []
    for item in listings:
        location = f"{item.city}{f' · {item.postal_code}' if item.postal_code else ''}"
        cards.append(f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e4;border-radius:12px;margin:0 0 18px"><tr><td style="padding:20px"><h2 style="font-size:20px;line-height:1.3;margin:0 0 13px;color:#111111">{html.escape(item.residence)}</h2><p style="margin:7px 0;color:#333333;font-size:14px;line-height:1.5"><strong>Ville :</strong> {html.escape(location)}</p><p style="margin:7px 0;color:#333333;font-size:14px;line-height:1.5"><strong>Logement :</strong> {html.escape(_details(item))}</p><p style="margin:7px 0;color:#777777;font-size:13px;line-height:1.5"><strong>Détecté :</strong> {html.escape(_date_label(item.last_seen_at))}</p><p style="margin:20px 0 0"><a class="cta-button" href="{html.escape(item.url, quote=True)}" style="display:block;background:#1769e0;color:#ffffff;text-align:center;font-size:16px;font-weight:bold;padding:15px 12px;border-radius:7px;text-decoration:none">Voir l'annonce sur le site CROUS</a></p></td></tr></table>""")
    summary = "1 logement a été détecté" if len(listings) == 1 else f"{len(listings)} logements ont été détectés"
    return template.replace("{{SUMMARY}}", summary).replace("{{COUNT}}", str(len(listings))).replace("{{CARDS}}", "".join(cards))
