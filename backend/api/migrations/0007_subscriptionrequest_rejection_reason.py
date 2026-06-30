from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_package_pricing_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionrequest',
            name='rejection_reason',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
    ]
