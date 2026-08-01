{#
  By default dbt concatenates the target's default schema with a model's
  custom `+schema` config (e.g. "dbt_marts_dbt_staging"). OpenLakehouse's
  staging/intermediate/marts layers should live in exactly the schema named
  in dbt_project.yml, so override the macro to use the custom schema verbatim
  when one is given.
#}
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
