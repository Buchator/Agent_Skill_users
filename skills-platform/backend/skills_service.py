"""
Skills Platform - Servicio de Skills
Este módulo encapsula la lógica de carga y ejecución de skills.
Los SKILL.md nunca se exponen al usuario final.
"""
import os
from typing import Dict, List, Optional
from pathlib import Path
from pydantic import BaseModel
from config import settings

# Catálogo de skills con sus metadatos públicos
# IMPORTANTE: El contenido real del skill (SKILL.md) nunca se expone
SKILLS_CATALOG = {
    "analisis-riesgos-datos": {
        "name": "Análisis de Riesgos de Datos",
        "description": "Analiza riesgos en el tratamiento de datos personales según la LOPDP de Ecuador. Identifica brechas de cumplimiento y sugiere medidas de mitigación.",
        "category": "Protección de Datos",
        "icon": "🔍",
        "input_schema": {
            "fields": [
                {"name": "proceso", "label": "Proceso a analizar", "type": "textarea", "required": True, "placeholder": "Describa el proceso de tratamiento de datos..."},
                {"name": "area", "label": "Área organizacional", "type": "text", "required": True},
                {"name": "datos_tratados", "label": "Tipos de datos tratados", "type": "textarea", "required": True},
                {"name": "contexto_adicional", "label": "Contexto adicional", "type": "textarea", "required": False}
            ]
        },
        "output_format": "markdown"
    },
    "citacion-academica-chicago": {
        "name": "Citación Académica Chicago-Deusto",
        "description": "Genera citas académicas en formato Chicago-Deusto adaptado para Ecuador (UASB). Soporta notas al pie, bibliografía y referencias parentéticas.",
        "category": "Académico",
        "icon": "📚",
        "input_schema": {
            "fields": [
                {"name": "tipo_fuente", "label": "Tipo de fuente", "type": "select", "required": True, 
                 "options": ["libro", "artículo", "ley", "sentencia", "web", "otro"]},
                {"name": "datos_fuente", "label": "Datos de la fuente", "type": "textarea", "required": True,
                 "placeholder": "Autor, título, editorial, año, etc."},
                {"name": "tipo_cita", "label": "Tipo de cita requerida", "type": "select", "required": True,
                 "options": ["nota al pie", "bibliografía", "parentética"]}
            ]
        },
        "output_format": "text"
    },
    "experto-consumidor-ec": {
        "name": "Experto en Derecho del Consumidor EC",
        "description": "Análisis de relaciones proveedor-consumidor bajo la LODC de Ecuador. Identifica cláusulas abusivas, evalúa prácticas comerciales y asesora sobre derechos.",
        "category": "Derecho del Consumidor",
        "icon": "🛒",
        "input_schema": {
            "fields": [
                {"name": "consulta", "label": "Consulta o caso", "type": "textarea", "required": True},
                {"name": "tipo_relacion", "label": "Tipo de relación", "type": "select", "required": False,
                 "options": ["compraventa", "servicios", "adhesión", "e-commerce", "otro"]},
                {"name": "documentos", "label": "Documentos relevantes", "type": "textarea", "required": False}
            ]
        },
        "output_format": "markdown"
    },
    "experto-pdp": {
        "name": "Experto en Protección de Datos EC",
        "description": "Verificación de compliance con la LOPDP de Ecuador. Valida bases de legitimación, transferencias, derechos de titulares y obligaciones del responsable.",
        "category": "Protección de Datos",
        "icon": "🛡️",
        "input_schema": {
            "fields": [
                {"name": "consulta", "label": "Consulta de compliance", "type": "textarea", "required": True,
                 "placeholder": "Describa su consulta sobre protección de datos..."},
                {"name": "contexto", "label": "Contexto organizacional", "type": "textarea", "required": False}
            ]
        },
        "output_format": "markdown"
    },
    "guia-documentos-pdp": {
        "name": "Guía de Documentos PDP",
        "description": "Genera cuadros explicativos de documentos de protección de datos personales. Explica naturaleza, aplicación y casos prácticos de instrumentos de cumplimiento.",
        "category": "Protección de Datos",
        "icon": "📄",
        "input_schema": {
            "fields": [
                {"name": "responsable", "label": "Nombre del responsable", "type": "text", "required": True},
                {"name": "contexto", "label": "Contexto operativo", "type": "textarea", "required": True},
                {"name": "documentos", "label": "Documentos a explicar", "type": "textarea", "required": True,
                 "placeholder": "Lista de documentos: aviso de privacidad, política, contrato encargado, etc."}
            ]
        },
        "output_format": "docx"
    },
    "hoja-ruta-mitigacion": {
        "name": "Hoja de Ruta de Mitigación",
        "description": "Genera planes estratégicos para mitigación de riesgos de protección de datos. Incluye medidas técnicas, organizativas y jurídicas priorizadas.",
        "category": "Protección de Datos",
        "icon": "🗺️",
        "input_schema": {
            "fields": [
                {"name": "hallazgos", "label": "Hallazgos de auditoría", "type": "textarea", "required": True,
                 "placeholder": "Liste los hallazgos identificados..."},
                {"name": "organizacion", "label": "Información de la organización", "type": "textarea", "required": True},
                {"name": "prioridades", "label": "Prioridades específicas", "type": "textarea", "required": False}
            ]
        },
        "output_format": "markdown"
    },
    "informe-riesgos-pdp": {
        "name": "Informe Ejecutivo de Riesgos PDP",
        "description": "Genera informes ejecutivos de análisis de riesgos en protección de datos conforme a LOPDP Ecuador e ISO 27001/27701.",
        "category": "Protección de Datos",
        "icon": "📊",
        "input_schema": {
            "fields": [
                {"name": "organizacion", "label": "Nombre de la organización", "type": "text", "required": True},
                {"name": "alcance", "label": "Alcance del análisis", "type": "textarea", "required": True},
                {"name": "procesos", "label": "Procesos evaluados", "type": "textarea", "required": True},
                {"name": "hallazgos", "label": "Hallazgos principales", "type": "textarea", "required": True}
            ]
        },
        "output_format": "docx"
    },
    "juntas-accionistas": {
        "name": "Juntas de Accionistas/Socios",
        "description": "Genera actas de juntas generales, cartas poder y nombramientos para compañías en Ecuador (S.A., Cía. Ltda., SAS).",
        "category": "Corporativo",
        "icon": "🏛️",
        "input_schema": {
            "fields": [
                {"name": "tipo_documento", "label": "Tipo de documento", "type": "select", "required": True,
                 "options": ["acta junta ordinaria", "acta junta extraordinaria", "carta poder", "nombramiento"]},
                {"name": "tipo_sociedad", "label": "Tipo de sociedad", "type": "select", "required": True,
                 "options": ["S.A.", "Cía. Ltda.", "SAS"]},
                {"name": "datos_empresa", "label": "Datos de la empresa", "type": "textarea", "required": True,
                 "placeholder": "Razón social, RUC, domicilio, capital..."},
                {"name": "orden_del_dia", "label": "Orden del día / Asunto", "type": "textarea", "required": True}
            ]
        },
        "output_format": "docx"
    },
    "propuestas-dph": {
        "name": "Propuestas de Honorarios DPH",
        "description": "Genera propuestas de honorarios profesionales para Dentons Paz Horowitz en formato PPTX y PDF.",
        "category": "Comercial",
        "icon": "💼",
        "input_schema": {
            "fields": [
                {"name": "cliente", "label": "Nombre del cliente", "type": "text", "required": True},
                {"name": "asunto", "label": "Asunto / Materia", "type": "text", "required": True},
                {"name": "descripcion_servicios", "label": "Descripción de servicios", "type": "textarea", "required": True},
                {"name": "equipo", "label": "Equipo asignado", "type": "textarea", "required": False},
                {"name": "honorarios", "label": "Estructura de honorarios", "type": "textarea", "required": True}
            ]
        },
        "output_format": "pptx"
    },
    "revisor-documentos-legales": {
        "name": "Revisor de Documentos Legales",
        "description": "Revisión integral de documentos legales en español. Detecta errores, inconsistencias y sugiere mejoras de contenido jurídico.",
        "category": "Revisión Legal",
        "icon": "✍️",
        "input_schema": {
            "fields": [
                {"name": "tipo_documento", "label": "Tipo de documento", "type": "select", "required": True,
                 "options": ["contrato", "memorando", "informe legal", "demanda", "escrito judicial", "política", "otro"]},
                {"name": "contenido", "label": "Contenido del documento", "type": "textarea", "required": True,
                 "placeholder": "Pegue el texto del documento a revisar..."},
                {"name": "destinatario", "label": "Destinatario", "type": "select", "required": False,
                 "options": ["cliente", "tribunal", "entidad pública", "interno"]},
                {"name": "instrucciones", "label": "Instrucciones específicas", "type": "textarea", "required": False}
            ]
        },
        "output_format": "markdown"
    }
}


class SkillInput(BaseModel):
    """Modelo para el input de un skill"""
    skill_id: str
    inputs: Dict[str, str]


class SkillService:
    """Servicio para gestionar y ejecutar skills"""
    
    def __init__(self):
        self.skills_dir = Path(settings.SKILLS_DIRECTORY)
    
    def get_catalog(self) -> List[Dict]:
        """Retorna el catálogo de skills disponibles (sin contenido interno)"""
        catalog = []
        for skill_id, metadata in SKILLS_CATALOG.items():
            catalog.append({
                "skill_id": skill_id,
                **metadata
            })
        return catalog
    
    def get_skill_metadata(self, skill_id: str) -> Optional[Dict]:
        """Retorna metadatos de un skill específico"""
        if skill_id in SKILLS_CATALOG:
            return {"skill_id": skill_id, **SKILLS_CATALOG[skill_id]}
        return None
    
    def _load_skill_content(self, skill_id: str) -> Optional[str]:
        """
        PRIVADO: Carga el contenido del SKILL.md
        Este método NUNCA debe exponer su contenido al usuario final
        """
        skill_path = self.skills_dir / skill_id / "SKILL.md"
        if skill_path.exists():
            return skill_path.read_text(encoding='utf-8')
        return None
    
    def _load_skill_references(self, skill_id: str) -> Dict[str, str]:
        """
        PRIVADO: Carga archivos de referencia del skill
        """
        references = {}
        refs_dir = self.skills_dir / skill_id / "references"
        if refs_dir.exists():
            for ref_file in refs_dir.glob("*.md"):
                references[ref_file.name] = ref_file.read_text(encoding='utf-8')
        return references
    
    def build_prompt(self, skill_id: str, user_inputs: Dict[str, str], document_text: Optional[str] = None) -> Optional[str]:
        """
        Construye el prompt completo para enviar a Claude.
        El skill y referencias se inyectan pero NUNCA se exponen al usuario.
        Si se proporciona document_text, se incluye como contexto del documento cargado.
        """
        skill_content = self._load_skill_content(skill_id)
        if not skill_content:
            return None

        references = self._load_skill_references(skill_id)

        # Construir el prompt del sistema
        system_parts = [
            "Eres un asistente especializado. Sigue las instrucciones del skill cargado.",
            "",
            "=== SKILL ===",
            skill_content,
        ]

        # Agregar referencias si existen
        if references:
            system_parts.append("\n=== REFERENCIAS ===")
            for ref_name, ref_content in references.items():
                system_parts.append(f"\n--- {ref_name} ---")
                system_parts.append(ref_content)

        system_prompt = "\n".join(system_parts)

        # Construir el mensaje del usuario basado en los inputs
        metadata = SKILLS_CATALOG.get(skill_id, {})
        input_schema = metadata.get("input_schema", {})

        user_message_parts = ["Por favor procesa la siguiente solicitud:\n"]
        for field in input_schema.get("fields", []):
            field_name = field["name"]
            field_label = field["label"]
            if field_name in user_inputs and user_inputs[field_name]:
                user_message_parts.append(f"**{field_label}:** {user_inputs[field_name]}")

        # Incluir el contenido de documentos cargados por el usuario
        if document_text and document_text.strip():
            user_message_parts.append("\n\n=== DOCUMENTOS CARGADOS POR EL USUARIO ===")
            user_message_parts.append(document_text)
            user_message_parts.append("=== FIN DE DOCUMENTOS ===")

        user_message = "\n".join(user_message_parts)

        return {
            "system": system_prompt,
            "user": user_message
        }


# Instancia global del servicio
skill_service = SkillService()
